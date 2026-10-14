import { createFirebaseEmailAuth } from "./firebase-email-auth";
import type { EmailAuthService } from "./email-login";

const unavailable = async (): Promise<never> => { throw Object.assign(new Error("Auth not configured"), { code: "functions/failed-precondition" }); };
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const emailAuth: EmailAuthService = Object.values(config).every(value => typeof value === "string" && value.trim())
  ? createFirebaseEmailAuth(config, { region: "europe-west1", returnUrl: new URL(import.meta.env.BASE_URL, location.origin).href })
  : {
    configured: false, lookup: unavailable, createAccount: unavailable, signIn: unavailable,
    sendPasswordReset: unavailable, sendVerification: unavailable, session: async () => null,
    authorize: unavailable, signOut: async () => {}, observe: () => () => {},
  };
