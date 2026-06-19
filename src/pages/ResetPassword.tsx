import React, { useState } from "react";
import { ChevronLeft, KeyRound, MessageSquareMore } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import OTPInput from "@/components/common/OTPInput";
import Password from "@/components/common/Password";
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyResetPasswordOtpMutation,
} from "@/services/operations/authAPI";
import { validatePassword as validatePasswordUtil } from "@/utils/formValidators";

interface LocationState {
  identifier?: string;
}

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { identifier = "" } = (location.state ?? {}) as LocationState;

  const forgotPasswordMutation = useForgotPasswordMutation();
  const verifyOtpMutation = useVerifyResetPasswordOtpMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();

  const clearPasswordErrors = () => {
    setPasswordError(undefined);
    setConfirmError(undefined);
  };

  const verifyOtp = (otpValue = otp) => {
    if (!identifier || otpValue.length !== 6 || verifyOtpMutation.isPending) {
      setOtpError(true);
      return;
    }

    setOtpError(false);
    verifyOtpMutation.mutate(
      { identifier, otp: otpValue },
      {
        onSuccess: () => setIsOtpVerified(true),
        onError: () => setOtpError(true),
      }
    );
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    setOtpError(false);
    if (isOtpVerified) {
      setIsOtpVerified(false);
      setPassword("");
      setConfirmPassword("");
      clearPasswordErrors();
    }
  };

  const resendOtp = () => {
    if (!identifier) return;
    forgotPasswordMutation.mutate(identifier, {
      onSuccess: () => {
        setOtp("");
        setOtpError(false);
        setIsOtpVerified(false);
        setPassword("");
        setConfirmPassword("");
        clearPasswordErrors();
      },
    });
  };

  const validatePassword = () => {
    clearPasswordErrors();
    // Reuse shared validator for length checks, then enforce complexity.
    const err = validatePasswordUtil(password, { required: true, minLength: 8 });
    if (err) {
      setPasswordError(err);
      return false;
    }

    // Require at least one uppercase, one lowercase, one digit and one special char.
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/.test(password)) {
      setPasswordError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      );
      return false;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !isOtpVerified || !validatePassword()) return;

    resetPasswordMutation.mutate(
      { identifier, otp, password },
      {
        onError: () => setPasswordError("Enter a valid password"),
      }
    );
  };

  const currentYear = new Date().getFullYear();

  if (!identifier) {
    return (
      <div className="w-full flex flex-col max-w-[550px] card card-lg">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
          Reset request missing
        </h1>
        <p className="text-neutral-700 dark:text-neutral-dark-700 mb-6">
          Please request a new password reset OTP from the login page.
        </p>
        <Button type="button" onClick={() => navigate("/login")}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">
      <button
        type="button"
        onClick={() => navigate("/forgot-password", { state: { identifier, passwordScreen: true } })}
        className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline self-start"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <div className="mt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xs bg-brand-50 border border-brand-200 flex items-center justify-center">
          {isOtpVerified ? (
            <KeyRound className="w-5 h-5 text-brand-600" />
          ) : (
            <MessageSquareMore className="w-5 h-5 text-brand-600" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-dark-950">
            {isOtpVerified ? "Set a new password" : "Verify reset OTP"}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-dark-700 mt-1">
            {isOtpVerified
              ? "Choose a strong password to secure your account."
              : `Enter the 6-digit OTP sent to ${identifier}.`}
          </p>
        </div>
      </div>

      <div className="divider" />

      {!isOtpVerified ? (
        <div className="space-y-4">
          <OTPInput
            value={otp}
            onChange={handleOtpChange}
            onComplete={verifyOtp}
            disabled={verifyOtpMutation.isPending}
            error={otpError}
          />
          {otpError && (
            <p className="text-center text-sm text-error-500 dark:text-error-dark-500">
              Enter Valid OTP
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              className="w-full"
              onClick={() => verifyOtp()}
              loading={verifyOtpMutation.isPending}
              disabled={otp.length !== 6 || verifyOtpMutation.isPending}
            >
              Verify OTP
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resendOtp}
              loading={forgotPasswordMutation.isPending}
              disabled={forgotPasswordMutation.isPending}
            >
              Resend OTP
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Password
            label="New password"
            star
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearPasswordErrors();
            }}
            errors={passwordError ? { message: passwordError } : undefined}
          />
          <Password
            label="Confirm password"
            star
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearPasswordErrors();
            }}
            errors={confirmError ? { message: confirmError } : undefined}
          />

          <Button
            type="submit"
            className="w-full"
            loading={resetPasswordMutation.isPending}
            disabled={resetPasswordMutation.isPending}
          >
            Reset password
          </Button>
        </form>
      )}

      <p className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200 text-center text-xs text-neutral-600 dark:text-neutral-dark-700">
        © {currentYear} All rights reserved.
      </p>
    </div>
  );
};

export default ResetPassword;