import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const requireModule = createRequire(import.meta.url);

// Load the real session code with an isolated clock, environment, and cookie jar.
// These test values never enter .env.local or a running deployment.
function sessionFixture() {
  let now = 1_800_000_000_000;
  let cookie;
  const env = { ADMIN_SESSION_SECRET: "isolated-unit-test-only" };
  const testModule = { exports: {} };
  const source = readFileSync(new URL("../lib/adminSession.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  class TestDate extends Date {
    static now() { return now; }
  }
  vm.runInNewContext(outputText, {
    exports: testModule.exports,
    module: testModule,
    Buffer,
    Date: TestDate,
    process: { env },
    require: (name) => name === "next/headers"
      ? { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) }
      : requireModule(name),
  });
  return {
    ...testModule.exports,
    env,
    advance: (milliseconds) => { now += milliseconds; },
    cookie: (value) => { cookie = value; },
  };
}

test("valid sessions authenticate and each login creates a distinct token", async () => {
  const session = sessionFixture();
  const token = session.createAdminSessionToken();
  assert.equal(session.verifyAdminSessionToken(token), true);
  assert.notEqual(session.createAdminSessionToken(), token);
  assert.equal(await session.isAdminRequest(), false);
  session.cookie(token);
  assert.equal(await session.isAdminRequest(), true);
});

test("modified expiry, nonce, and signature cannot authenticate", () => {
  const session = sessionFixture();
  const token = session.createAdminSessionToken();
  for (const index of [1, 2, 3]) {
    const parts = token.split(".");
    parts[index] = (parts[index][0] === "1" ? "2" : "1") + parts[index].slice(1);
    assert.equal(session.verifyAdminSessionToken(parts.join(".")), false);
  }
});

test("a captured token expires on the server after eight hours", async () => {
  const session = sessionFixture();
  const token = session.createAdminSessionToken();
  session.cookie(token);
  session.advance(session.ADMIN_SESSION_MAX_AGE * 1000 - 1000);
  assert.equal(await session.isAdminRequest(), true);
  session.advance(1000);
  assert.equal(await session.isAdminRequest(), false);
});

test("the old perpetual session token and malformed cookies are rejected", () => {
  const session = sessionFixture();
  const version = "mindlet-admin-v1";
  const oldSignature = createHmac("sha256", session.env.ADMIN_SESSION_SECRET).update(version).digest("hex");
  for (const token of ["", "invalid", `${version}.${oldSignature}`, `${version}.NaN.a.b`, "a.b.c.d.e"]) {
    assert.equal(session.verifyAdminSessionToken(token), false);
  }
});

test("missing or rotated secrets fail closed, even with an existing cookie", async () => {
  const session = sessionFixture();
  session.cookie(session.createAdminSessionToken());
  session.env.ADMIN_SESSION_SECRET = "rotated-test-only";
  assert.equal(await session.isAdminRequest(), false);
  delete session.env.ADMIN_SESSION_SECRET;
  assert.equal(await session.isAdminRequest(), false);
  assert.throws(() => session.createAdminSessionToken());
});
