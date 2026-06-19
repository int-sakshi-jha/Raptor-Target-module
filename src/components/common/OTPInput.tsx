import React, { useRef, useCallback, useEffect } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  className = "",
  error = false,
  ...props
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if(!disabled){
      inputRefs.current[0]?.focus();
    }
  }, [disabled]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const setDigit = useCallback(
    (index: number, digit: string) => {
      if (!/^\d*$/.test(digit)) return;
      const next = digits.slice();
      next[index] = digit;
      const joined = next.join("");
      onChange(joined);
      if (joined.length === length && onComplete) {
        onComplete(joined);
      }
    },
    [digits, length, onChange, onComplete]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigit(index - 1, "");
      }
    },
    [digits, setDigit]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, length);
      if (!pasted) return;
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      if (pasted.length === length && onComplete) {
        onComplete(pasted);
      }
    },
    [length, onChange, onComplete]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const v = e.target.value;
      if (v.length > 1) {
        const digitsOnly = v.replace(/\D/g, "").slice(0, length);
        if (!digitsOnly) return;

        if (digitsOnly.length < length) {
          setDigit(index, digitsOnly[digitsOnly.length - 1]);
          if (index < length - 1) {
            inputRefs.current[index + 1]?.focus();
          }
          return;
        }

        onChange(digitsOnly);
        const nextIndex = Math.min(digitsOnly.length, length) - 1;
        inputRefs.current[nextIndex]?.focus();
        if (digitsOnly.length === length && onComplete) {
          onComplete(digitsOnly);
        }
        return;
      }
      setDigit(index, v);
      if (v && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [length, onChange, onComplete, setDigit]
  );

  return (
    <div className={`flex gap-2 justify-center ${className}`}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={length}
          autoComplete="one-time-code"
          value={digits[index] ?? ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`input w-12 h-12 px-0 text-center text-lg font-semibold rounded-xs ${
            error ? "input-error" : ""
          }`}
          aria-label={`Digit ${index + 1}`}
          {...props}
        />
      ))}
    </div>
  );
};

export default OTPInput;
