export const AUTH_HONEYPOT_FIELD = "companyWebsite";

export function hasHoneypotValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value != null;
}
