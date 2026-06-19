import type React from "react";
import type { UseFormSetError, FieldValues, FieldPath, UseFormGetValues } from "react-hook-form";
import { formatErrorMessage } from "./errorFormatter";
import toast from "react-hot-toast";
// ── Patterns ──────────────────────────────────────────────────────────────────

export const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;
export const PHONE_PATTERN = /^\d{10}$/;
export const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

// ── Input sanitizers ──────────────────────────────────────────────────────────

export function sanitizePhoneInput(event: React.FormEvent<HTMLInputElement>): void {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
}

// ── Adapter ───────────────────────────────────────────────────────────────────


export function toRHF(fn: () => string | undefined): true | string {
    return fn() ?? true;
}

// ── Email ─────────────────────────────────────────────────────────────────────

/**

 *
 * @param options.required      - Treat empty value as an error (default: true).
 * @param options.currentEmail  - When provided, rejects if new === current.
 */
export function validateEmail(
    value: string | null | undefined,
    options: { required?: boolean; currentEmail?: string } = {},
): string | undefined {
    const { required = true, currentEmail } = options;
    const trimmed = String(value ?? "").trim();

    if (!trimmed) return required ? "Email is required" : undefined;
    if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address";
    if (currentEmail && trimmed.toLowerCase() === currentEmail.trim().toLowerCase()) {
        return "New email must be different from the current email";
    }

    return undefined;
}

// ── Phone ─────────────────────────────────────────────────────────────────────

/**

 * @param options.required      - Treat empty value as an error (default: false).
 * @param options.strict10      - Enforce exactly 10 digits, no formatting chars (default: false).
 * @param options.currentPhone  - When provided, rejects if new === current (digit-normalized).
 */
export function validatePhone(
    value: string | null | undefined,
    options: { required?: boolean; strict10?: boolean; currentPhone?: string } = {},
): string | undefined {
    const { required = false, strict10 = false, currentPhone } = options;
    const trimmed = String(value ?? "").trim();

    if (!trimmed) return required ? "Phone number is required" : undefined;

    if (strict10) {
        if (!PHONE_PATTERN.test(trimmed)) return "Phone number must be exactly 10 digits";
    } else {
        if (!/^\+?[\d\s()-]+$/.test(trimmed)) return "Enter a valid phone number";

        const digitCount = trimmed.replace(/\D/g, "").length;
        if (digitCount < 10 || digitCount > 15) return "Phone number must contain 10 to 15 digits";

        const plusCount = (trimmed.match(/\+/g) ?? []).length;
        if (plusCount > 1 || (plusCount === 1 && !trimmed.startsWith("+"))) {
            return "Enter a valid phone number";
        }
    }

    if (currentPhone) {
        const normalizedNew = trimmed.replace(/\D/g, "");
        const normalizedCurrent = currentPhone.trim().replace(/\D/g, "");
        if (normalizedNew === normalizedCurrent) {
            return "New phone must be different from the current phone";
        }
    }

    return undefined;
}

// ── Indian mobile formatting ──────────────────────────────────────────────────

export function getMobileDigits(value: string): string {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    return digits.slice(0, 10);
}

export function formatIndianMobile(value: string): string {
    const digits = getMobileDigits(value);
    return digits ? `+91${digits}` : "";
}

// ── Identifier (email or Indian mobile) ──────────────────────────────────────

export type ForgotPasswordIdentifierType = "email" | "mobile" | null;

export function getIdentifierType(value: string): ForgotPasswordIdentifierType {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (EMAIL_PATTERN.test(trimmed)) return "email";
    if (/^[+\d]/.test(trimmed)) return "mobile";
    return null;
}

export function normalizeIdentifier(value: string): string {
    const trimmed = value.trim();
    return /^[+\d]/.test(trimmed) ? formatIndianMobile(trimmed) : trimmed;
}

// ── Password ──────────────────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 8;

/**
 * Validates a single password field.
 *
 * @param options.required   - Treat empty value as an error (default: true).
 * @param options.minLength  - Minimum character length (default: 8).
 * @param options.maxLength  - Maximum character length (default: 255).
 */
export function validatePassword(
    value: string | null | undefined,
    options: { required?: boolean; minLength?: number; maxLength?: number } = {},
): string | undefined {
    const { required = true, minLength = PASSWORD_MIN_LENGTH, maxLength = 255 } = options;
    const trimmed = String(value ?? "").trim();

    if (!trimmed) return required ? "Password is required" : undefined;
    if (trimmed.length < minLength) return `Password must be at least ${minLength} characters`;
    if (trimmed.length > maxLength) return `Password must not exceed ${maxLength} characters`;

    return undefined;
}


export function validatePasswordChange(
    currentPassword: string,
    newPassword: string,
): { currentPassword?: string; newPassword?: string } {
    const errors: { currentPassword?: string; newPassword?: string } = {};

    const currentErr = validatePassword(currentPassword);
    if (currentErr) errors.currentPassword = currentErr;

    const newErr = validatePassword(newPassword);
    if (newErr) {
        errors.newPassword = newErr;
    } else if (newPassword === currentPassword) {
        errors.newPassword = "New password must be different from current password";
    }

    return errors;
}

// ── React Hook Form helpers ───────────────────────────────────────────────────


export function getFirstValidationMessage(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;

    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
    }

    for (const nested of Object.values(record)) {
        const msg = getFirstValidationMessage(nested);
        if (msg) return msg;
    }

    return null;
}

type ApiValidationParameter = {
    name?: string;
    message?: string;
};

type ApiErrorShape = {
    response?: {
        data?: {
            message?: string;
            details?: {
                parameters?: ApiValidationParameter[];
            };
        };
    };
};

function normalizeBackendFieldName(name: string): string {
    return name
        .replace(/\[(\d+)\]/g, ".$1")
        .replace(/__/g, "_")
        .trim();
}

export function extractBackendValidationErrors<T extends FieldValues>(
    error: unknown,
    getValues?: UseFormGetValues<T>
): { field: string; message: string }[] {
    const errorData = (error as ApiErrorShape)?.response?.data;
    const params = errorData?.details?.parameters;
    const result: { field: string; message: string }[] = [];

    if (Array.isArray(params)) {
        params.forEach((p) => {
            const field = normalizeBackendFieldName(String(p?.name ?? ""));
            const message = String(p?.message ?? "").trim();
            if (field && message) result.push({ field, message });
        });
    }

    // Heuristics for generic server errors without details.parameters
    if (result.length === 0 && errorData && typeof errorData.message === "string") {
        const msg = errorData.message.toLowerCase();
        const errorMessage = errorData.message;
        const possibleFields: string[] = [];
        
        const formVals = getValues ? getValues() : undefined;
        const hasVal = (key: string) => !formVals || !!formVals[key];

        if (msg.includes("phone") || msg.includes("mobile")) {
            if (msg.includes("contact")) {
                if (hasVal("contact_person_phone")) possibleFields.push("contact_person_phone");
            } else if (msg.includes("user") || msg.includes("owner") || msg.includes("use")) {
                if (hasVal("phone")) possibleFields.push("phone");
                if (hasVal("mobile")) possibleFields.push("mobile");
            } else {
                if (hasVal("phone")) possibleFields.push("phone");
                if (hasVal("contact_person_phone")) possibleFields.push("contact_person_phone");
                if (hasVal("mobile")) possibleFields.push("mobile");
            }
        }
        if (msg.includes("email")) {
            if (msg.includes("contact")) {
                if (hasVal("contact_person_email")) possibleFields.push("contact_person_email");
            } else if (msg.includes("user") || msg.includes("owner")) {
                if (hasVal("email")) possibleFields.push("email");
            } else {
                // If message doesn't specify, we still check both but prioritize 'email' if it's a conflict
                if (hasVal("email")) possibleFields.push("email");
                if (hasVal("contact_person_email")) possibleFields.push("contact_person_email");
            }
        }
        if (msg.includes("username")) {
            if (hasVal("username")) possibleFields.push("username");
        }
        if (msg.includes("plant name") || msg.includes("plant_name")) {
            if (hasVal("plant_name")) possibleFields.push("plant_name");
        }
        if (msg.includes("pincode")) {
            if (hasVal("pincode")) possibleFields.push("pincode");
        }
        if (msg.includes("latitude")) {
            if (hasVal("latitude")) possibleFields.push("latitude");
        }
        if (msg.includes("longitude")) {
            if (hasVal("longitude")) possibleFields.push("longitude");
        }

        // If no value matched, just push all heuristics to ensure it's not swallowed silently
        if (possibleFields.length === 0) {
            if (msg.includes("phone") || msg.includes("mobile")) possibleFields.push("phone", "contact_person_phone");
            if (msg.includes("email")) possibleFields.push("email", "contact_person_email");
            if (msg.includes("latitude")) possibleFields.push("latitude");
            if (msg.includes("longitude")) possibleFields.push("longitude");
        }

        possibleFields.forEach((f) => {
            result.push({ field: f, message: errorMessage });
        });
    }

    return result;
}

export function applyBackendErrors<T extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<T>,
    getValues?: UseFormGetValues<T>
): void {
    const apiFieldErrors = extractBackendValidationErrors(error, getValues);
    
    if (apiFieldErrors.length === 0) {
        toast.error(formatErrorMessage(error));
        return;
    }

    // let focused = false;
    apiFieldErrors.forEach(({ field, message }) => {
        setError(field as FieldPath<T>, { type: "server", message });
    });

    setTimeout(() => {
        for (const { field } of apiFieldErrors) {
            const el = document.querySelector(`[name="${field}"]`) || document.getElementById(field);
            if (el) {
                const container = el.closest('.react-select-container') || el;
                // Basic visibility check: if offsetHeight is 0, it's likely hidden (e.g. inactive tab)
                if ((container as HTMLElement).offsetHeight > 0) {
                    if (typeof container.scrollIntoView === 'function') {
                        container.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    if (typeof (el as HTMLElement).focus === 'function') {
                        (el as HTMLElement).focus();
                    }
                    // focused = true;
                    break;
                }
            }
        }

        // if (!focused) {
        //     toast.error(formatErrorMessage(error));
        // }
    }, 100);
}
