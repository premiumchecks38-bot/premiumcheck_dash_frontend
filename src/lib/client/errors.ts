import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "./api";

/**
 * One place that turns backend errors into words for people. Codes first, then the HTTP status;
 * the backend's own message is used when it is already written for the dashboard user.
 */
const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "The email or password is not right.",
  ACCOUNT_DISABLED: "This account has been deactivated. Ask the owner to reactivate it.",
  INVALID_TWO_FACTOR_CODE: "That code did not work. Check the code and try again.",
  INVALID_TWO_FACTOR_TOKEN: "The sign in step has expired. Enter your email and password again.",
  TWO_FACTOR_EXPIRED: "The sign in step has expired. Enter your email and password again.",
  TWO_FACTOR_SETUP_REQUIRED: "Set up two factor authentication to continue.",
  INVALID_RESET_TOKEN: "This reset link is invalid or has expired. Ask for a new one.",
  INVALID_INVITE_TOKEN: "This invitation link is invalid or has expired. Ask for a new one.",
  INVALID_PASSWORD: "Your current password is not right.",
  PASSWORD_REUSED: "Choose a password you have not used before.",
  PAGE_ACCESS_DENIED: "You do not have permission to do that.",
  OWNER_PROTECTED: "The owner account cannot be changed.",
  OWNER_ONLY: "Only the owner can do that.",
  CANNOT_MODIFY_SELF: "Use your own account settings for this change.",
  EMAIL_TAKEN: "There is already a team member with this email.",
  PAGE_NOT_GRANTABLE: "Team, Settings and Audit log are only for the owner and admins.",
  INVITE_NOT_PENDING: "This person has already accepted their invitation.",
  CSRF_FAILED: "Your session security check failed. Reload the page and try again.",
  SESSION_EXPIRED: "Your session has ended. Please sign in again.",
  BACKEND_UNAVAILABLE: "The server could not be reached. Try again in a moment.",
  NETWORK_ERROR: "You appear to be offline. Check your connection.",
};

const STATUS_MESSAGES: Record<number, string> = {
  401: "Please sign in again.",
  403: "You do not have permission to do that.",
  404: "That item no longer exists.",
  409: "This was changed by someone else or conflicts with existing data. Refresh and try again.",
  413: "The file is too large.",
  422: "Some details need correcting.",
  429: "Too many attempts. Please wait and try again.",
};

/** "about 4 minutes" style wait, from seconds. */
export function waitText(seconds: number): string {
  if (seconds < 60) {
    const whole = Math.max(1, Math.round(seconds));
    return whole === 1 ? "1 second" : `${String(whole)} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${String(minutes)} minutes`;
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  if (error.status === 429) {
    return error.retryAfter
      ? `Too many attempts. Try again in ${waitText(error.retryAfter)}.`
      : (STATUS_MESSAGES[429] ?? error.message);
  }
  return CODE_MESSAGES[error.code] ?? STATUS_MESSAGES[error.status] ?? error.message;
}

/**
 * For actions on content: conflicts (409) and refused requests (400) carry a message written for
 * the person (for example "This category still has 3 services"), so it is shown as is.
 */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError && (error.status === 409 || error.status === 400) && error.message)
    return CODE_MESSAGES[error.code] ?? error.message;
  return errorMessage(error);
}

interface ValidationDetail {
  loc?: (string | number)[];
  message?: string;
  msg?: string;
}

/** Field errors from a 422 response: { email: "..." } using the last part of each location. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422 || !Array.isArray(error.details))
    return {};
  const out: Record<string, string> = {};
  for (const item of error.details as ValidationDetail[]) {
    const field = item.loc?.filter((part) => part !== "body").at(-1);
    const message = item.message ?? item.msg;
    if (typeof field === "string" && message && !(field in out)) {
      out[field] = message.replace(/^Value error, /, "");
    }
  }
  return out;
}

/**
 * Put 422 errors on the form fields (fieldMap maps backend names to form names). Returns true
 * when at least one field received an error, so the caller can skip the generic toast.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>> = {},
): boolean {
  const errors = fieldErrors(error);
  let applied = false;
  for (const [field, message] of Object.entries(errors)) {
    const name = fieldMap[field] ?? (field as Path<T>);
    setError(name, { type: "server", message });
    applied = true;
  }
  return applied;
}
