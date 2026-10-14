import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function normalizeNigerianPhone(input: string): string {
  const phone = parsePhoneNumberFromString(input, "NG");
  const type = phone?.getType();
  const isMobile = type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE";

  if (phone?.country !== "NG" || !phone.isValid() || !isMobile) {
    throw new Error("Enter a valid Nigerian mobile number");
  }

  return phone.number;
}
