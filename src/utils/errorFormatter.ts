/**
 * Formats error responses from the API into user-friendly messages.
 * Handles both simple error messages and detailed error responses with parameter validation errors.
 */

import toast from "react-hot-toast";

export interface ErrorParameter {
  name: string;
  location: string;
  value: string | null;
  message: string;
}

export interface DetailedErrorResponse {
  success: false;
  code: number;
  message: string;
  details?: {
    parameters?: ErrorParameter[];
  };
}

/** HTTP status from an axios-style error (`error.response.status`), if present. */
export function getErrorHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

/**
 * Formats an error response into a user-friendly message string.
 * If the error has detailed parameter validation errors, it formats them nicely.
 * Otherwise, returns the main error message.
 */
export function formatErrorMessage(error: unknown): string {
  // Check if it's an axios error with response data
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { data?: unknown } };
    const responseData = axiosError.response?.data;

    if (responseData && typeof responseData === "object") {
      const errorData = responseData as Partial<DetailedErrorResponse>;

      // Check if it's a detailed error response with parameters
      if (
        errorData.details?.parameters &&
        Array.isArray(errorData.details.parameters) &&
        errorData.details.parameters.length > 0
      ) {
        // Format parameter errors
        const parameterErrors = errorData.details.parameters
          .map((param) => {
            const fieldName = param.name
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            return `${fieldName}: ${param.message}`;
          })
          .join("\n");

        return `${errorData.message || "Validation errors occurred"}:\n${parameterErrors}`;
      }

      // Return main message if available
      if (errorData.message) {
        return errorData.message;
      }
    }
  }

  // Check if it's a plain error object with message
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  // Fallback
  return "Something went wrong";
}

export function toastError(error: unknown): void {
  toast.error(formatErrorMessage(error));
}

/**
 * Formats an error response for toast notification.
 * Returns an array of messages - first element is the main message,
 * and subsequent elements are parameter-specific errors.
 */
export function formatErrorForToast(error: unknown): {
  mainMessage: string;
  parameterMessages: string[];
} {
  const parameterMessages: string[] = [];

  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { data?: unknown } };
    const responseData = axiosError.response?.data;

    if (responseData && typeof responseData === "object") {
      const errorData = responseData as Partial<DetailedErrorResponse>;

      if (
        errorData.details?.parameters &&
        Array.isArray(errorData.details.parameters) &&
        errorData.details.parameters.length > 0
      ) {
        errorData.details.parameters.forEach((param) => {
          const fieldName = param.name
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          parameterMessages.push(`${fieldName}: ${param.message}`);
        });
      }

      return {
        mainMessage: errorData.message || "Validation errors occurred",
        parameterMessages,
      };
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    return {
      mainMessage: String((error as { message: string }).message),
      parameterMessages: [],
    };
  }

  return {
    mainMessage: "Something went wrong",
    parameterMessages: [],
  };
}
