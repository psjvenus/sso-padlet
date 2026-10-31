import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mindlet_admin";
const SESSION_VALUE = "mindlet-admin-v1";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function signingSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("관리자 세션 환경 변수가 설정되지 않았습니다.");
  return secret;
}

function signature(value: string) {
  return createHmac("sha256", signingSecret())
    .update(value)
    .digest("hex");
}

export function createAdminSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const value = `${SESSION_VALUE}.${expires}.${randomBytes(16).toString("hex")}`;
  return `${value}.${signature(value)}`;
}

export function verifyAdminSessionToken(token: string) {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [version, expires, nonce, suppliedSignature] = parts;
  if (version !== SESSION_VALUE || !/^\d+$/.test(expires) || !/^[a-f0-9]{32}$/.test(nonce)) return false;
  const expiry = Number(expires);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + ADMIN_SESSION_MAX_AGE) return false;
  if (!/^[a-f0-9]{64}$/.test(suppliedSignature)) return false;

  const left = Buffer.from(suppliedSignature, "hex");
  const right = Buffer.from(signature(parts.slice(0, 3).join(".")), "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

export async function isAdminRequest() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token ? verifyAdminSessionToken(token) : false;
}
