import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, MessageSquareMore } from "lucide-react";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { useForgotPasswordMutation } from "@/services/operations/authAPI";
import {
  EMAIL_PATTERN,
  INDIAN_MOBILE_PATTERN,
  getMobileDigits,
  formatIndianMobile,
  getIdentifierType,
  normalizeIdentifier,
} from "@/utils/formValidators";

interface LocationState {
  identifier?: string;
  passwordScreen?: boolean;
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const forgotPasswordMutation = useForgotPasswordMutation();

  // Read state passed via navigate(..., { state }) — no URL params
  const state = (location.state ?? {}) as LocationState;
  const initialIdentifier = state.identifier ?? "";
  const passwordScreen = state.passwordScreen ?? false;

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [identifierError, setIdentifierError] = useState<string | undefined>(
    undefined
  );

  // Protect: only accessible when password login is enabled and an identifier is present
  if (!passwordScreen || !initialIdentifier) {
    navigate("/login", { replace: true });
    return null;
  }

  const validateIdentifier = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Email or mobile number is required";
    if (EMAIL_PATTERN.test(trimmed)) return undefined;

    if (/^[+\d]/.test(trimmed)) {
      const digits = getMobileDigits(trimmed);
      if (digits.length !== 10 || !INDIAN_MOBILE_PATTERN.test(digits)) {
        return "Enter a valid 10-digit Indian mobile number";
      }
      return undefined;
    }

    if (trimmed.includes("@")) return "Invalid email address";
    return "Enter a valid email or mobile number";
  };

  const handleIdentifierChange = (value: string) => {
    const nextValue = /^[+\d]/.test(value.trimStart())
      ? formatIndianMobile(value)
      : value;

    setIdentifier(nextValue);
    setIdentifierError(undefined);
  };

  const identifierType = getIdentifierType(identifier);
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const resetTargetLabel =
    identifierType === "mobile" ? "your mobile number" : "your email";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateIdentifier(identifier);
    setIdentifierError(err);
    if (err) return;

    forgotPasswordMutation.mutate(normalizedIdentifier, {
      onSuccess: () => {
        navigate("/reset-password", {
          state: { identifier: normalizedIdentifier },
        });
      },
    });
    return undefined;
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-base font-medium text-brand-600 hover:text-brand-700 hover:underline self-start"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to login
      </button>

      <div className="mt-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-xs bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-500 flex items-center justify-center shrink-0">
          <MessageSquareMore className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-dark-950">
            Forgot password
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-dark-700 mt-1">
            We&apos;ll send a password reset OTP to{" "}
            <span className="font-semibold text-neutral-900 dark:text-neutral-dark-950">
              {normalizedIdentifier}
            </span>
            {" "}using {resetTargetLabel}.
          </p>
        </div>
      </div>

      <div className="divider" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email / Mobile Number"
          star
          type="text"
          placeholder="you@example.com / +919876543210"
          startIcon={<MessageSquareMore className="w-5 h-5 shrink-0" />}
          value={identifier}
          onChange={(e) => handleIdentifierChange(e.target.value)}
          errors={identifierError ? { message: identifierError } : undefined}
        />

        <Button
          type="submit"
          className="w-full"
          loading={forgotPasswordMutation.isPending}
          disabled={forgotPasswordMutation.isPending}
        >
          Send reset OTP
        </Button>
      </form>

      <p className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200 text-center text-sm text-neutral-600 dark:text-neutral-dark-700">
        © {currentYear} All rights reserved.
      </p>
    </div>
  );
};

export default ForgotPassword;