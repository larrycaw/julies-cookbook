import test from "node:test";
import assert from "node:assert/strict";
import { EmailLoginController, type EmailAuthService, type EmailRoute, type LoginSession } from "../lib/email-login.ts";
import { emailFlow, validateEmailAccess } from "../functions/src/email-policy.ts";

function service(route: EmailRoute = "create") {
  let session: LoginSession | null = null;
  const calls: string[] = [];
  const auth: EmailAuthService = {
    configured: true,
    async lookup(email) { calls.push(`lookup:${email}`); return route; },
    async createAccount(email) { calls.push("create"); session = { email, displayName: "Julie", verified: false }; return { session, verificationSent: true }; },
    async signIn(email) { calls.push("login"); session = { email, displayName: "Julie", verified: true }; return session; },
    async sendPasswordReset(email) { calls.push(`reset:${email}`); },
    async sendVerification() { calls.push("verification"); },
    async session() { return session; },
    async authorize() { calls.push("authorize"); },
    async signOut() { session = null; calls.push("logout"); },
    observe() { return () => {}; },
  };
  return { auth, calls, setSession: (value: LoginSession | null) => { session = value; } };
}

test("first visit creates a password but only admits an authorized, verified account", async () => {
  const mock = service();
  const login = new EmailLoginController(mock.auth);
  await login.continueWithEmail("  JULIE@Example.com  ");
  assert.equal(login.getSnapshot().step, "create");
  assert.equal(login.getSnapshot().email, "julie@example.com");
  await login.create("A long passphrase", "does not match");
  assert.ok(login.getSnapshot().error);
  assert.equal(mock.calls.includes("create"), false);
  await login.create("A long passphrase", "A long passphrase");
  assert.equal(login.getSnapshot().step, "verify");
  assert.equal(mock.calls.includes("authorize"), false);
  await login.refreshVerification();
  assert.equal(login.getSnapshot().step, "verify");
  mock.setSession({ email: "julie@example.com", displayName: "Julie", verified: true });
  await login.refreshVerification();
  assert.equal(login.getSnapshot().step, "ready");
  assert.equal(mock.calls.filter(call => call === "authorize").length, 1);
  await login.signOut();
  assert.equal(login.getSnapshot().session, null);
  assert.equal(login.getSnapshot().step, "email");
});

test("wrong returning password stays in login and recovery never creates another account", async () => {
  const mock = service("login");
  mock.auth.signIn = async () => { throw { code: "auth/invalid-credential" }; };
  const login = new EmailLoginController(mock.auth);
  await login.continueWithEmail("julie@example.com");
  await login.signIn("wrong password");
  assert.equal(login.getSnapshot().step, "login");
  assert.match(login.getSnapshot().error, /passordet er feil/);
  await login.resetPassword();
  assert.ok(mock.calls.includes("reset:julie@example.com"));
  assert.equal(mock.calls.includes("create"), false);
});

test("existing social account sets a password through an email link", async () => {
  const mock = service("set-password");
  const login = new EmailLoginController(mock.auth);
  await login.continueWithEmail("julie@example.com");
  await login.resetPassword();
  assert.equal(login.getSnapshot().step, "set-password");
  assert.ok(mock.calls.includes("reset:julie@example.com"));
  assert.equal(mock.calls.includes("create"), false);
});

test("denied access never advances a verified account to ready", async () => {
  const mock = service("login");
  mock.auth.authorize = async () => { throw { code: "functions/permission-denied" }; };
  const login = new EmailLoginController(mock.auth);
  await login.continueWithEmail("julie@example.com");
  await login.signIn("A long passphrase");
  assert.equal(login.getSnapshot().step, "login");
  assert.equal(login.getSnapshot().session, null);
  assert.match(login.getSnapshot().error, /ikke tilgang/);
});

test("registration race moves to login; a failed verification mail can be retried", async () => {
  const mock = service();
  mock.auth.createAccount = async () => { throw { code: "auth/email-already-in-use" }; };
  const login = new EmailLoginController(mock.auth);
  await login.continueWithEmail("julie@example.com");
  await login.create("A long passphrase", "A long passphrase");
  assert.equal(login.getSnapshot().step, "login");
  const another = service();
  another.auth.createAccount = async email => ({ session: { email, displayName: "Julie", verified: false }, verificationSent: false });
  const signup = new EmailLoginController(another.auth);
  await signup.continueWithEmail("julie@example.com");
  await signup.create("A long passphrase", "A long passphrase");
  assert.equal(signup.getSnapshot().step, "verify");
  assert.match(signup.getSnapshot().message, /klarte ikke å sende/);
  await signup.resendVerification();
  assert.ok(another.calls.includes("verification"));
});

test("unconfigured authentication makes no requests, and duplicate submits make one request", async () => {
  const mock = service();
  mock.auth.configured = false;
  const unavailable = new EmailLoginController(mock.auth);
  await unavailable.continueWithEmail("julie@example.com");
  assert.deepEqual(mock.calls, []);
  mock.auth.configured = true;
  let resolve!: (route: EmailRoute) => void;
  let lookups = 0;
  mock.auth.lookup = () => { lookups++; return new Promise<EmailRoute>(done => { resolve = done; }); };
  const login = new EmailLoginController(mock.auth);
  const first = login.continueWithEmail("julie@example.com");
  await login.continueWithEmail("julie@example.com");
  resolve("create");
  await first;
  assert.equal(lookups, 1);
});

test("server looks up only invited email addresses and does not convert failures into signup", async () => {
  let lookups = 0;
  const lookup = async () => { lookups++; return { disabled: false, providerData: [{ providerId: "password" }] }; };
  await assert.rejects(emailFlow("stranger@example.com", "julie@example.com,isak@example.com", lookup), { code: "permission-denied" });
  assert.equal(lookups, 0);
  assert.equal(await emailFlow("JULIE@EXAMPLE.COM", "julie@example.com", lookup), "login");
  assert.equal(await emailFlow("julie@example.com", "julie@example.com", async () => { throw { code: "auth/user-not-found" }; }), "create");
  assert.equal(await emailFlow("julie@example.com", "julie@example.com", async () => ({ disabled: false, providerData: [{ providerId: "google.com" }] })), "set-password");
  await assert.rejects(emailFlow("julie@example.com", "julie@example.com", async () => { throw new Error("network failed"); }), /network failed/);
  await assert.rejects(emailFlow("julie@example.com", "julie@example.com", async () => ({ disabled: true, providerData: [] })), { code: "permission-denied" });
  await assert.rejects(emailFlow("julie@example.com", "", lookup), { code: "failed-precondition" });
});

test("server access requires authentication, a verified email and the allowlist", () => {
  assert.throws(() => validateEmailAccess(undefined, "julie@example.com"), { code: "unauthenticated" });
  assert.throws(() => validateEmailAccess({ token: { email: "julie@example.com", email_verified: false } }, "julie@example.com"), { code: "permission-denied" });
  assert.throws(() => validateEmailAccess({ token: { email: "stranger@example.com", email_verified: true } }, "julie@example.com"), { code: "permission-denied" });
  assert.doesNotThrow(() => validateEmailAccess({ token: { email: "julie@example.com", email_verified: true } }, "julie@example.com"));
});
