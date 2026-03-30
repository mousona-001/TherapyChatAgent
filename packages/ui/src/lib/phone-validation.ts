import { parsePhoneNumberFromString } from "libphonenumber-js";

export function isValidPhoneNumber(phone: string) {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone);
    return phoneNumber?.isValid() || false;
  } catch {
    return false;
  }
}

