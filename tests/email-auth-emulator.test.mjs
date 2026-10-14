import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { getApps, deleteApp } from "firebase/app";
import { getAuth, applyActionCode, confirmPasswordReset } from "firebase/auth";
import { createFirebaseEmailAuth } from "../lib/firebase-email-auth.ts";
import { EmailLoginController } from "../lib/email-login.ts";
import { emailFlow, validateEmailAccess } from "../functions/src/email-policy.ts";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp: initializeAdmin, deleteApp: deleteAdmin } = require("firebase-admin/app");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
const projectId = "demo-julies-kokebok";
if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("This test requires the isolated local Auth emulator.");
const admin = initializeAdmin({ projectId }, "email-auth-test");
const adminAuth = getAdminAuth(admin);
const base = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
const emails = "julie@example.com,isak@example.com";

test("real Firebase Auth creates first password, verifies email, signs in again and resets passwords", async () => {
  await fetch(`${base}/emulator/v1/projects/${projectId}/accounts`, { method: "DELETE" });
  let clientAuth;
  const service = createFirebaseEmailAuth({ projectId, apiKey: "fake-api-key", authDomain: "demo-julies-kokebok.firebaseapp.com" }, {
    name: "email-auth-test", returnUrl: "https://larrycaw.github.io/julies-kokebok/",
    emulator: { authUrl: base, functionsHost: "127.0.0.1", functionsPort: 5001 },
    policy: {
      lookup: email => emailFlow(email, emails, email => adminAuth.getUserByEmail(email)),
      async authorize() { const token = await clientAuth.currentUser.getIdTokenResult(true); validateEmailAccess({ token: token.claims }, emails); },
    },
  });
  const app = getApps().find(app => app.name === "email-auth-test");
  clientAuth = getAuth(app);
  try {
    const flow = new EmailLoginController(service);
    await flow.continueWithEmail("JULIE@EXAMPLE.COM");
    assert.equal(flow.getSnapshot().step, "create");
    await flow.create("A local test passphrase", "A local test passphrase");
    assert.equal(flow.getSnapshot().step, "verify");
    await flow.refreshVerification();
    assert.equal(flow.getSnapshot().step, "verify");
    let codes = (await (await fetch(`${base}/emulator/v1/projects/${projectId}/oobCodes`)).json()).oobCodes;
    const verify = codes.find(code => code.requestType === "VERIFY_EMAIL" && code.email === "julie@example.com");
    assert.ok(verify);
    await applyActionCode(clientAuth, verify.oobCode);
    await flow.refreshVerification();
    assert.equal(flow.getSnapshot().step, "ready");
    await flow.signOut();
    await flow.continueWithEmail("julie@example.com");
    assert.equal(flow.getSnapshot().step, "login");
    await flow.signIn("wrong password");
    assert.equal(flow.getSnapshot().step, "login");
    assert.ok(flow.getSnapshot().error);
    await flow.signIn("A local test passphrase");
    assert.equal(flow.getSnapshot().step, "ready");
    await flow.signOut();
    await flow.continueWithEmail("julie@example.com");
    await flow.resetPassword();
    codes = (await (await fetch(`${base}/emulator/v1/projects/${projectId}/oobCodes`)).json()).oobCodes;
    const reset = codes.find(code => code.requestType === "PASSWORD_RESET" && code.email === "julie@example.com");
    assert.ok(reset);
    await confirmPasswordReset(clientAuth, reset.oobCode, "A changed test passphrase");
    await flow.signIn("A changed test passphrase");
    assert.equal(flow.getSnapshot().step, "ready");
    await flow.signOut();
    await adminAuth.createUser({ email: "isak@example.com" });
    await flow.continueWithEmail("isak@example.com");
    assert.equal(flow.getSnapshot().step, "set-password");
    await flow.resetPassword();
    codes = (await (await fetch(`${base}/emulator/v1/projects/${projectId}/oobCodes`)).json()).oobCodes;
    const setup = codes.find(code => code.requestType === "PASSWORD_RESET" && code.email === "isak@example.com");
    assert.ok(setup);
    await confirmPasswordReset(clientAuth, setup.oobCode, "An initial test passphrase");
    assert.equal(await service.lookup("isak@example.com"), "login");
    await assert.rejects(service.lookup("stranger@example.com"), { code: "permission-denied" });
  } finally { await service.signOut(); await deleteApp(app); await deleteAdmin(admin); }
});
