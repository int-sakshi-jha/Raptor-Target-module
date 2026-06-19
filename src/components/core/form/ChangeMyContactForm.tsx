import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import OTPInput from "@/components/common/OTPInput";
import {
  useChangeMyEmailMutation,
  useChangeMyPhoneMutation,
  useVerifyMyNewEmailMutation,
  useVerifyMyNewPhoneMutation,
} from "@/services/operations/profileAPI";
import { getMobileDigits, formatIndianMobile, validateEmail, validatePhone } from "@/utils/formValidators";
import { ChevronLeft } from "lucide-react";

const RESEND_COOLDOWN_SEC = 60;

type ChangeMyContactMode = "email" | "phone";

type ChangeMyContactFormProps = {
  mode: ChangeMyContactMode;
  currentValue: string;
  onSuccess?: () => void;
  close: () => void;
};

const ChangeMyContactForm: React.FC<ChangeMyContactFormProps> = ({
  mode,
  currentValue,
  onSuccess,
  close,
}) => {
  const [step, setStep] = useState<"value" | "otp">("value");
  const [nextValue, setNextValue] = useState("");
  const [valueError, setValueError] = useState<string | undefined>(undefined);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const changeMyEmailMutation = useChangeMyEmailMutation();
  const verifyMyNewEmailMutation = useVerifyMyNewEmailMutation();
  const changeMyPhoneMutation = useChangeMyPhoneMutation();
  const verifyMyNewPhoneMutation = useVerifyMyNewPhoneMutation();

  const isEmailMode = mode === "email";
  const normalizedCurrentValue = useMemo(() => {
    if (isEmailMode) return currentValue.trim().toLowerCase();
    return currentValue.trim();
  }, [currentValue, isEmailMode]);

  const changeMutation = isEmailMode
    ? changeMyEmailMutation
    : changeMyPhoneMutation;
  const verifyMutation = isEmailMode
    ? verifyMyNewEmailMutation
    : verifyMyNewPhoneMutation;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateValue = (value: string) => {
    if (isEmailMode) {
      return validateEmail(value, { currentEmail: normalizedCurrentValue }) ?? undefined;
    }
    const digits = getMobileDigits(value);
    const currentDigits = getMobileDigits(normalizedCurrentValue);
    return validatePhone(digits, { strict10: true, currentPhone: currentDigits });
  };

  const handleSendOtp = () => {
    const error = validateValue(nextValue);
    setValueError(error);
    if (error) return;

    const onSuccess = () => {
      setStep("otp");
      setOtp("");
      setOtpError(false);
      setResendCooldown(RESEND_COOLDOWN_SEC);
    };

    if (isEmailMode) {
      changeMyEmailMutation.mutate({ email: nextValue.trim() }, { onSuccess });
      return;
    }

    changeMyPhoneMutation.mutate({ phone: nextValue.trim() }, { onSuccess });
  };

  const handleVerifyOtp = (otpValue: string) => {
    if (otpValue.length !== 6) return;
    setOtpError(false);

    const verifyOptions = {
      onSuccess: () => {
        onSuccess?.();
        close();
      },
      onError: () => {
        setOtpError(true);
      },
    };

    if (isEmailMode) {
      verifyMyNewEmailMutation.mutate(
        { email: nextValue.trim(), otp: otpValue },
        verifyOptions,
      );
      return;
    }

    verifyMyNewPhoneMutation.mutate(
      { phone: nextValue.trim(), otp: otpValue },
      verifyOptions,
    );
  };

  const handleValueChange = (value: string) => {
    setNextValue(isEmailMode ? value : formatIndianMobile(value));
    setValueError(undefined);
  };

  const handleBack = () => {
    setStep("value");
    setOtp("");
    setOtpError(false);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    setOtpError(false);
  };

  const actionLabel = isEmailMode ? "Email" : "Phone";
  const valueLabel = isEmailMode ? "New Email" : "New Phone";
  const verifyTitle = `Verify New ${actionLabel}`;
  const placeholder = isEmailMode
    ? "e.g., john.doe@example.com"
    : "+91 9876543210";

  return (
    <div className="space-y-2" aria-live="polite">
      {step === "value" ? (
        <>
          <section className="space-y-4">
            <Input
              label={valueLabel}
              star
              type={isEmailMode ? "email" : "text"}
              value={nextValue}
              onChange={(e) => handleValueChange(e.target.value)}
              errors={valueError ? { message: valueError } : undefined}
              placeholder={placeholder}
            />
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendOtp}
              loading={changeMutation.isPending}
              disabled={changeMutation.isPending}
            >
              {`Change ${actionLabel}`}
            </Button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <section className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-dark-950">
                  {verifyTitle}
                </h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-dark-500 mt-0.5">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="font-semibold text-neutral-700 dark:text-neutral-dark-800">
                    {nextValue.trim()}
                  </span>
                  .
                </p>
              </div>
              <span className="badge-brand shrink-0">OTP</span>
            </div>

            <OTPInput
              length={6}
              value={otp}
              onChange={handleOtpChange}
              onComplete={handleVerifyOtp}
              disabled={verifyMutation.isPending}
              error={otpError}
            />

            <Button
              type="button"
              onClick={() => handleVerifyOtp(otp)}
              disabled={otp.length !== 6 || verifyMutation.isPending}
              loading={verifyMutation.isPending}
              className="w-full"
            >
              Submit
            </Button>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-dark-200">
              <p className="text-sm text-neutral-700 dark:text-neutral-dark-700">
                Didn&apos;t receive OTP?{" "}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendCooldown > 0 || changeMutation.isPending}
                  className="font-medium text-brand-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend"}
                </button>
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ChangeMyContactForm;
