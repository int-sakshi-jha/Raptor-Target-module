  import React, { useCallback, useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import { ChevronLeft, Mail, ShieldCheck } from "lucide-react";
  import Input from "@/components/common/Input";
  import Button from "@/components/common/Button";
  import OTPInput from "@/components/common/OTPInput";
  import {
    useSendOtpMutation,
    useVerifyOtpMutation,
    usePasswordLoginMutation,
    type SendOtpResponse,
    type SendOtpCheckResponse,
  } from "@/services/operations/authAPI";
  import Password from "@/components/common/Password";

  type LoginMode = "email" | "chooser" | "otp" | "password";
  type LoginIdentifierType = "email" | "mobile" | "username" | null;

  const RESEND_COOLDOWN_SEC = 60;
  const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;
  const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

  const getMobileDigits = (value: string) => {
  return value.replace(/\D/g, "").slice(0, 10);
  };

  const formatIndianMobileInput = (value: string) => {
    const digits = getMobileDigits(value);
    return digits ? `${digits}` : "";
  };

  const getIdentifierType = (value: string): LoginIdentifierType => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (EMAIL_PATTERN.test(trimmed)) return "email";
  if (/^\d/.test(trimmed)) return "mobile";
    if (USERNAME_PATTERN.test(trimmed)) return "username";
    return null;
  };

  const normalizeIdentifier = (value: string) => {
    const trimmed = value.trim();
  return /^\d/.test(trimmed) ? formatIndianMobileInput(trimmed) : trimmed;
  };

  const parseScreenFlags = (
    res: SendOtpResponse
  ): {
    otpScreen: boolean;
    passwordScreen: boolean;
    message?: string;
  } => {
    const direct = res as SendOtpCheckResponse;
    if (
      typeof direct.otpScreen === "boolean" ||
      typeof direct.passwordScreen === "boolean"
    ) {
      return {
        otpScreen: !!direct.otpScreen,
        passwordScreen: !!direct.passwordScreen,
        message: direct.message,
      };
    }

    const wrapped = res as SendOtpResponse & {
      code?: number;
      data?: { otpScreen?: boolean; passwordScreen?: boolean; message?: string };
    };
    const data = wrapped?.data ?? {};
    return {
      otpScreen: !!data.otpScreen,
      passwordScreen: !!data.passwordScreen,
      message: data.message,
    };
  };

  const Login: React.FC = () => {
    const navigate = useNavigate();

    const [identifier, setIdentifier] = useState("");
    const [identifierError, setIdentifierError] = useState<string | undefined>(
      undefined
    );

    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

    // These are set after the identifier check API responds
    const [otpScreen, setOtpScreen] = useState(false);
    const [passwordScreen, setPasswordScreen] = useState(false);

    const [mode, setMode] = useState<LoginMode>("email");

    const sendOtpMutation = useSendOtpMutation();
    const verifyOtpMutation = useVerifyOtpMutation();
    const passwordLoginMutation = usePasswordLoginMutation();

    // Resend cooldown timer
    useEffect(() => {
      if (resendCooldown <= 0) return;
      const t = setInterval(
        () => setResendCooldown((c) => (c > 0 ? c - 1 : 0)),
        1000
      );
      return () => clearInterval(t);
    }, [resendCooldown]);

    const validateIdentifier = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return "Email, username or mobile number is required";

      if (EMAIL_PATTERN.test(trimmed)) return undefined;

    if (/^\d/.test(trimmed)) {
        const digits = getMobileDigits(trimmed);
        if (digits.length !== 10 || !INDIAN_MOBILE_PATTERN.test(digits)) {
          return "Enter a valid 10-digit Indian mobile number";
        }
        return undefined;
      }

      if (USERNAME_PATTERN.test(trimmed)) return undefined;

      if (trimmed.includes("@")) return "Invalid email address";

      return "Enter a valid username";
    };

    const handleIdentifierChange = (value: string) => {
    const nextValue = /^\d/.test(value.trimStart())
      ? formatIndianMobileInput(value)
      : value;

      setIdentifier(nextValue);
      setIdentifierError(undefined);
    };

    const identifierType = getIdentifierType(identifier);
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const isEmailLogin = identifierType === "email";

    // Step 1: Check what login methods are available for this identifier (no OTP sent yet)
    const handleIdentifierSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateIdentifier(identifier);
      setIdentifierError(err);
      if (err) return;

      setOtpError(false);
      setPasswordError(undefined);

      if (identifierType === "username") {
        setOtp("");
        setOtpScreen(false);
        setPasswordScreen(true);
        setMode("password");
        return;
      }

      // Check available login methods — do NOT send OTP here
      sendOtpMutation.mutate(
        { identifier: normalizedIdentifier, check: true },
        {
          onSuccess: (raw) => {
            const { otpScreen: otpFlag, passwordScreen: passFlag } =
              parseScreenFlags(raw);

            setOtpScreen(otpFlag);
            setPasswordScreen(passFlag);

            if (otpFlag && !passFlag) {
              // Only OTP available — go straight to OTP screen (user will trigger send)
              setMode("otp");
              setOtp("");
            } else if (!otpFlag && passFlag) {
              setMode("password");
            } else if (otpFlag && passFlag) {
              setMode("chooser");
            }
            // else: both false — stay on identifier screen, API should have returned an error
          },
        }
      );
    };

    // Explicitly send OTP (called from OTP screen or chooser)
    const handleSendOtp = useCallback(() => {
      if (!normalizedIdentifier) return;
      sendOtpMutation.mutate(
        { identifier : normalizedIdentifier },
        {
          onSuccess: () => {
            setResendCooldown(RESEND_COOLDOWN_SEC);
          },
        }
      );
    }, [normalizedIdentifier, sendOtpMutation]);

    const handleResend = useCallback(() => {
      if (resendCooldown > 0 || !normalizedIdentifier) return;
      handleSendOtp();
    }, [normalizedIdentifier, resendCooldown, handleSendOtp]);

    const onOtpComplete = (otpValue: string) => {
      if (otpValue.length !== 6 || !normalizedIdentifier) return;
      setOtpError(false);
      verifyOtpMutation.mutate(
        { identifier: normalizedIdentifier, otp: otpValue },
        {
          onError: () => setOtpError(true),
        }
      );
    };

    const handleOtpChange = (value: string) => {
      setOtp(value);
      setOtpError(false);
    };

    const backToEmail = () => {
      setMode("email");
      setOtp("");
      setOtpError(false);
      setPassword("");
      setPasswordError(undefined);
      setOtpScreen(false);
      setPasswordScreen(false);
      sendOtpMutation.reset();
    };

    const backFromOtpOrPassword = () => {
      if (otpScreen && passwordScreen) {
        setMode("chooser");
        setOtp("");
        setOtpError(false);
        setPassword("");
        setPasswordError(undefined);
        return;
      }
      backToEmail();
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateIdentifier(identifier);
      setIdentifierError(err);
      if (err) return;

      if (!password) {
        setPasswordError("Password is required");
        return;
      }

      setPasswordError(undefined);
      passwordLoginMutation.mutate(
        {
          identifier: normalizedIdentifier,
          password,
          is_mobile: false,
        },
        {
          onError: () => setPasswordError("Enter a valid password"),
        }
      );
    };

    const handleGotoForgotPassword = () => {
      navigate("/forgot-password", {
        state: { identifier: normalizedIdentifier, passwordScreen },
      });
    };

    const currentYear = new Date().getFullYear();

    // ─── OTP Screen ────────────────────────────────────────────────────────────
    if (mode === "otp") {
      return (
        <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">
          <button
            type="button"
            onClick={backFromOtpOrPassword}
            className="flex items-center gap-1 text-base text-brand-600 hover:text-brand-700 hover:underline font-medium self-start"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
                Verification code
              </h2>
              <p className="text-base text-neutral-600 dark:text-neutral-dark-700">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-neutral-900 dark:text-neutral-dark-950">
                  {normalizedIdentifier}
                </span>
                .
              </p>
            </div>
            <span className="badge-brand shrink-0">OTP</span>
          </div>

          {/* Send OTP button — visible before OTP is sent */}
          {resendCooldown === 0 && !sendOtpMutation.isSuccess && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendOtp}
              loading={sendOtpMutation.isPending}
              disabled={sendOtpMutation.isPending}
              className="w-full mt-6"
            >
              Send OTP
            </Button>
          )}

          {/* Show OTP input only after OTP has been sent */}
          {(sendOtpMutation.isSuccess || resendCooldown > 0) && (
            <>
              <div className="divider" />

              <OTPInput
                length={6}
                // autoFocus
                value={otp}
                onChange={handleOtpChange}
                onComplete={onOtpComplete}
                disabled={verifyOtpMutation.isPending}
                error={otpError}
              />
              {otpError && (
                <p className="mt-2 text-center text-sm text-error-500 dark:text-error-dark-500">
                  Enter a Valid OTP
                </p>
              )}

              <Button
                onClick={() => onOtpComplete(otp)}
                disabled={otp.length !== 6 || verifyOtpMutation.isPending}
                loading={verifyOtpMutation.isPending}
                className="w-full mt-6"
              >
                Confirm
              </Button>

              <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200">
                <p className="text-base text-neutral-700 dark:text-neutral-dark-700">
                  Didn&apos;t receive OTP?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || sendOtpMutation.isPending}
                    className="font-medium text-brand-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      );
    }

    // ─── Password Screen ────────────────────────────────────────────────────────
    if (mode === "password") {
      return (
        <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">
          <button
            type="button"
            onClick={backFromOtpOrPassword}
            className="flex items-center gap-1 text-base text-brand-600 hover:text-brand-700 hover:underline font-medium self-start"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
                Welcome back
              </h1>
              <p className="text-base text-neutral-600 dark:text-neutral-dark-700">
                Enter your password to continue.
              </p>
            </div>
            <span className="badge-neutral shrink-0">Password</span>
          </div>

          <div className="divider" />

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Email, Username or Phone"
              star
              type="text"
              placeholder="Enter your email, username or phone"
              startIcon={<Mail className="w-5 h-5 shrink-0" />}
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              errors={identifierError ? { message: identifierError } : undefined}
            />
            <Password
              label="Password"
              star
              placeholder="••••••••"
              value={password}
              autoFocus
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(undefined);
              }}
              errors={passwordError ? { message: passwordError } : undefined}
            />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-dark-700">
                <ShieldCheck className="w-4 h-4" />
                <span>Secure password login</span>
              </div>
              {passwordScreen && isEmailLogin && (
                <button
                  type="button"
                  onClick={handleGotoForgotPassword}
                  className="text-brand-600 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={passwordLoginMutation.isPending}
              disabled={passwordLoginMutation.isPending}
            >
              Login
            </Button>
          </form>

          <p className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200 text-center text-sm text-neutral-600 dark:text-neutral-dark-700">
            Using a shared device? Make sure to log out after your session.
          </p>

          <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-dark-700">
            © {currentYear} All rights reserved.
          </p>
        </div>
      );
    }

    // ─── Chooser Screen ─────────────────────────────────────────────────────────
    if (mode === "chooser") {
      return (
        <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">
          <button
            type="button"
            onClick={backToEmail}
            className="flex items-center gap-1 text-base text-brand-600 hover:text-brand-700 hover:underline font-medium self-start"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
                Choose login method
              </h1>
              <p className="text-base text-neutral-600 dark:text-neutral-dark-700">
                You can log in using a one-time code or your account password.
              </p>
            </div>
            <span className="badge-neutral shrink-0">OTP / Password</span>
          </div>

          <div className="divider" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {otpScreen && (
              <Button
                type="button"
                variant="outline"
                loading={sendOtpMutation.isPending}
                disabled={sendOtpMutation.isPending}
                onClick={() => {
                  setOtp("");
                  sendOtpMutation.mutate(
                    { identifier: normalizedIdentifier },
                    {
                      onSuccess: () => {
                        setResendCooldown(RESEND_COOLDOWN_SEC);
                        setMode("otp");
                      },
                    }
                  );
                }}
                className="w-full"
              >
                Login with OTP
              </Button>
            )}
            {passwordScreen && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode("password")}
                className="w-full"
              >
                Login with password
              </Button>
            )}
          </div>

          {passwordScreen && isEmailLogin && (
            <button
              type="button"
              onClick={handleGotoForgotPassword}
              className="mt-5 text-base text-brand-600 hover:underline self-start"
            >
              Forgot password?
            </button>
          )}

          <p className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200 text-center text-sm text-neutral-600 dark:text-neutral-dark-700">
            © {currentYear} All rights reserved.
          </p>
        </div>
      );
    }

    // ─── Email Screen (default) ─────────────────────────────────────────────────
    return (
      <div className="w-full mx-auto flex flex-col max-w-[550px] card card-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-dark-950 mb-2">
              Welcome back
            </h1>
            <p className="text-xs sm:text-base text-neutral-600 dark:text-neutral-dark-700">
              Login to continue to your dashboard
            </p>
          </div>
          <span className="badge-neutral shrink-0">Login</span>
        </div>

        <div className="divider" />

        <form onSubmit={handleIdentifierSubmit} className="space-y-4">
          <Input
            label="Email, Username or Phone"
            star
            type="text"
            placeholder="Enter your email, username or phone"
            startIcon={<Mail className="w-5 h-5 shrink-0" />}
            value={identifier}
            autoFocus
            onChange={(e) => handleIdentifierChange(e.target.value)}
            errors={identifierError ? { message: identifierError } : undefined}
          />
          <Button
            type="submit"
            className="w-full"
            loading={sendOtpMutation.isPending}
            disabled={sendOtpMutation.isPending}
          >
            Continue
          </Button>
        </form>

        <div className="divider" />

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked
            readOnly
            disabled
            className="mt-1 rounded-xs border-neutral-300 dark:border-neutral-600 bg-brand-500 text-brand-600 focus:ring-brand-500 cursor-not-allowed"
            aria-hidden
          />
          <label
            htmlFor="terms"
            className="text-sm text-neutral-600 dark:text-neutral-dark-700 cursor-default select-none"
          >
            I have read and agree to{" "}
            <a
              href="/privacy"
              className="text-brand-600 hover:underline font-medium"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="/terms"
              className="text-brand-600 hover:underline font-medium"
            >
              User Terms
            </a>
          </label>
        </div>

        <p className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-dark-200 text-center text-sm text-neutral-600 dark:text-neutral-dark-700">
          © {currentYear} All rights reserved.
        </p>
      </div>
    );
  };

export default Login;
