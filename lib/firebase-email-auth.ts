import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, reload, onAuthStateChanged, connectAuthEmulator, type User } from "firebase/auth";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import type { EmailAuthService, EmailRoute, LoginSession } from "./email-login";

export function createFirebaseEmailAuth(config: FirebaseOptions, options: {
  name?: string; region?: string; returnUrl: string;
  emulator?: { authUrl: string; functionsHost: string; functionsPort: number };
  policy?: { lookup(email: string): Promise<EmailRoute>; authorize(): Promise<void> };
}): EmailAuthService {
  const app = initializeApp(config, options.name);
  const auth = getAuth(app);
  const functions = getFunctions(app, options.region || "europe-west1");
  if (options.emulator) {
    connectAuthEmulator(auth, options.emulator.authUrl, { disableWarnings: true });
    connectFunctionsEmulator(functions, options.emulator.functionsHost, options.emulator.functionsPort);
  }
  const lookup = httpsCallable<{ email: string }, { flow: EmailRoute }>(functions, "emailSignInOptions");
  const authorize = httpsCallable<void, { allowed: boolean }>(functions, "validateCookbookAccess");
  const session = (user: User): LoginSession => ({ email: user.email || "", displayName: user.displayName || user.email?.split("@")[0] || "", verified: user.emailVerified });
  const actionCodeSettings = { url: options.returnUrl, handleCodeInApp: false };
  return {
    configured: true,
    async lookup(email) {
      const flow = options.policy ? await options.policy.lookup(email) : (await lookup({ email })).data.flow;
      if (!["create", "login", "set-password"].includes(flow)) throw new Error("Unexpected login response");
      return flow;
    },
    async createAccount(email, password) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      let verificationSent = true;
      try { await sendEmailVerification(user, actionCodeSettings); } catch { verificationSent = false; }
      return { session: session(user), verificationSent };
    },
    async signIn(email, password) { return session((await signInWithEmailAndPassword(auth, email, password)).user); },
    async sendPasswordReset(email) { await sendPasswordResetEmail(auth, email, actionCodeSettings); },
    async sendVerification() { if (!auth.currentUser) throw new Error("Not signed in"); await sendEmailVerification(auth.currentUser, actionCodeSettings); },
    async session(refresh = false) {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) return null;
      if (refresh) { await reload(user); await user.getIdToken(true); }
      return session(user);
    },
    async authorize() {
      if (options.policy) { await options.policy.authorize(); return; }
      if (!(await authorize()).data.allowed) throw Object.assign(new Error("Access denied"), { code: "functions/permission-denied" });
    },
    async signOut() { await signOut(auth); },
    observe(listener) { return onAuthStateChanged(auth, listener); },
  };
}
