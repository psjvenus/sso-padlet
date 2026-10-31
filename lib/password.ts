import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function verifyPlainPassword(password: string, expectedPassword: string) {
  const passwordBuffer = Buffer.from(password, "utf8");
  const expectedBuffer = Buffer.from(expectedPassword, "utf8");

  return (
    passwordBuffer.length === expectedBuffer.length &&
    timingSafeEqual(passwordBuffer, expectedBuffer)
  );
}

export function isFourDigitPassword(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value);
}
