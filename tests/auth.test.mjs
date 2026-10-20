import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_MESSAGES,
  callbackErrorCode,
  hasUnverifiedOAuthEmail,
  isSignupRejection,
  loginErrorMessage,
  mapSignupError,
} from "../src/lib/authErrors.js";

test("penolakan trigger (pesan generik Supabase) dipetakan ke pesan domain", () => {
  const e = { status: 500, code: "unexpected_failure", message: "Database error saving new user" };
  assert.equal(mapSignupError(e), AUTH_MESSAGES.domain);
});

test("penolakan Auth Hook dengan pesan kita dikenali", () => {
  assert.ok(isSignupRejection({ message: "Pendaftaran hanya untuk email resmi organisasi." }));
  assert.equal(mapSignupError({ message: "Pendaftaran hanya untuk email resmi organisasi." }), AUTH_MESSAGES.domain);
});

test("rate limit dan password lemah", () => {
  assert.equal(mapSignupError({ status: 429, message: "x" }), AUTH_MESSAGES.rateLimited);
  assert.equal(mapSignupError({ code: "over_email_send_rate_limit" }), AUTH_MESSAGES.rateLimited);
  assert.equal(mapSignupError({ code: "weak_password" }), AUTH_MESSAGES.weakPassword);
});

test("error tak dikenal -> pesan generik, TIDAK meneruskan teks mentah", () => {
  const raw = 'duplicate key value violates unique constraint "users_pkey" (internal detail)';
  const msg = mapSignupError({ status: 400, code: "x", message: raw });
  assert.equal(msg, AUTH_MESSAGES.generic);
  assert.ok(!msg.includes("users_pkey"));
});

test("pesan tidak menyebut daftar domain tertentu", () => {
  for (const m of Object.values(AUTH_MESSAGES)) assert.doesNotMatch(m, /@|\.org|\.com|\.id\b/);
});

test("tanpa error -> string kosong", () => assert.equal(mapSignupError(null), ""));

test("callbackErrorCode", () => {
  const p = (s) => new URLSearchParams(s);
  assert.equal(callbackErrorCode(p("")), "auth");
  assert.equal(callbackErrorCode(p("error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user")), "domain");
  assert.equal(callbackErrorCode(p("error=access_denied&error_description=User+denied")), "auth");
});

test("loginErrorMessage", () => {
  assert.equal(loginErrorMessage("domain"), AUTH_MESSAGES.domain);
  assert.equal(loginErrorMessage("unverified"), AUTH_MESSAGES.unverified);
  assert.equal(loginErrorMessage("auth"), AUTH_MESSAGES.oauth);
  assert.equal(loginErrorMessage("<script>"), "");
  assert.equal(loginErrorMessage(null), "");
});

test("hasUnverifiedOAuthEmail: hanya menolak bila eksplisit false pada identitas non-email", () => {
  assert.equal(hasUnverifiedOAuthEmail(null), false);
  assert.equal(hasUnverifiedOAuthEmail({ identities: [{ provider: "email", identity_data: { email_verified: false } }] }), false);
  assert.equal(hasUnverifiedOAuthEmail({ identities: [{ provider: "google", identity_data: { email_verified: true } }] }), false);
  assert.equal(hasUnverifiedOAuthEmail({ identities: [{ provider: "google", identity_data: {} }] }), false);
  assert.equal(hasUnverifiedOAuthEmail({ identities: [{ provider: "google", identity_data: { email_verified: false } }] }), true);
});
