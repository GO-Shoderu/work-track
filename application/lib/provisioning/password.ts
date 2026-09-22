import "server-only";
import { randomBytes } from "node:crypto";

// 192 random bits, plus fixed category characters for common password rules.
// The prefix adds no entropy and is not counted as part of the strength.
export function generateTemporaryPassword() {
  return `Aa1!${randomBytes(24).toString("base64url")}`;
}
