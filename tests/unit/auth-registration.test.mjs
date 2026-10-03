import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRegistrationInput, registerWithCredentials, RegistrationInputError } from "../../src/shared/services/auth-registration.ts";

function makeAuth({ user = { id: "new-user" }, session = { access_token: "session" }, signUpError = null, updateError = null } = {}) {
  const calls = { signUp: [], updateUser: [] };
  return {
    calls,
    auth: {
      async signUp(credentials) {
        calls.signUp.push(credentials);
        return { data: { user, session }, error: signUpError };
      },
      async updateUser(attributes) {
        calls.updateUser.push(attributes);
        return { error: updateError };
      },
    },
  };
}

test("accepts email-only registration and creates email as the primary identity", async () => {
  const { auth, calls } = makeAuth();
  const result = await registerWithCredentials(auth, {
    fullName: "  Nguyễn An ", email: " AN@example.com ", phone: "", password: "secret1",
  });

  assert.equal(result.primary, "email");
  assert.equal(calls.signUp[0].email, "an@example.com");
  assert.equal(calls.signUp[0].options.data.full_name, "Nguyễn An");
  assert.equal(calls.updateUser.length, 0);
});

test("accepts phone-only registration without calling OTP APIs", async () => {
  const { auth, calls } = makeAuth();
  const result = await registerWithCredentials(auth, {
    fullName: "Bình", email: "", phone: "0912 345 678", password: "secret1",
  });

  assert.equal(result.primary, "phone");
  assert.equal(calls.signUp[0].phone, "+84912345678");
  assert.deepEqual(calls.updateUser, []);
});

test("uses phone first, then attaches email to the same account", async () => {
  const { auth, calls } = makeAuth();
  const result = await registerWithCredentials(auth, {
    fullName: "Chi", email: "chi@example.com", phone: "0901234567", password: "secret1",
  });

  assert.equal(result.primary, "phone");
  assert.equal(result.secondaryEmailLinked, true);
  assert.equal(calls.signUp[0].phone, "+84901234567");
  assert.equal(calls.signUp[0].email, undefined);
  assert.deepEqual(calls.updateUser, [{ email: "chi@example.com" }]);
});

test("requires at least one identifier and rejects malformed optional identifiers", () => {
  assert.throws(() => normalizeRegistrationInput({ fullName: "An", email: "", phone: "", password: "secret1" }), RegistrationInputError);
  assert.throws(() => normalizeRegistrationInput({ fullName: "An", email: "bad-email", phone: "", password: "secret1" }), RegistrationInputError);
  assert.throws(() => normalizeRegistrationInput({ fullName: "An", email: "an@example.com", phone: "012345", password: "secret1" }), RegistrationInputError);
});

test("does not merge accounts when the secondary email is already in use", async () => {
  const duplicate = new Error("User already registered");
  const { auth } = makeAuth({ updateError: duplicate });
  const result = await registerWithCredentials(auth, {
    fullName: "An", email: "existing@example.com", phone: "0912345678", password: "secret1",
  });

  assert.equal(result.user.id, "new-user");
  assert.equal(result.secondaryEmailLinked, false);
  assert.equal(result.secondaryEmailError, duplicate);
});

test("requires a session, indicating confirmations must be disabled for no-OTP signup", async () => {
  const { auth } = makeAuth({ session: null });
  await assert.rejects(
    registerWithCredentials(auth, { fullName: "An", email: "an@example.com", phone: "", password: "secret1" }),
    /tắt xác nhận Email và Phone/,
  );
});
