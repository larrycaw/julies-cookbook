import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { AccessError, emailFlow, validateEmailAccess } from "./email-policy.js";

initializeApp();
const collaborators = defineString("COOKBOOK_EMAILS", { description: "Approved cookbook email addresses, separated by commas." });
const options = { region: "europe-west1", maxInstances: 2, cors: ["https://larrycaw.github.io", /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/] };
function rethrow(error: unknown): never {
  if (error instanceof AccessError) throw new HttpsError(error.code, error.message);
  throw new HttpsError("internal", "Could not complete the sign-in request.");
}

// Firebase protects email enumeration in its client API by default. We only
// disclose the required sign-in flow for explicitly invited addresses.
export const emailSignInOptions = onCall(options, async request => {
  try { return { flow: await emailFlow(request.data?.email, collaborators.value(), email => getAuth().getUserByEmail(email)) }; }
  catch (error) { return rethrow(error); }
});

// Validates the current account before the client advances past verification.
// Data/storage rules must independently enforce this same access policy.
export const validateCookbookAccess = onCall(options, request => {
  try { validateEmailAccess(request.auth, collaborators.value()); return { allowed: true }; }
  catch (error) { return rethrow(error); }
});
