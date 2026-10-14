export type EmailRoute = "create" | "login" | "set-password";
export type LoginStep = "email" | "create" | "login" | "set-password" | "verify" | "ready";
export type LoginSession = { email: string; displayName: string; verified: boolean };
export interface EmailAuthService {
  configured: boolean;
  lookup(email: string): Promise<EmailRoute>;
  createAccount(email: string, password: string): Promise<{ session: LoginSession; verificationSent: boolean }>;
  signIn(email: string, password: string): Promise<LoginSession>;
  sendPasswordReset(email: string): Promise<void>;
  sendVerification(): Promise<void>;
  session(refresh?: boolean): Promise<LoginSession | null>;
  authorize(): Promise<void>;
  signOut(): Promise<void>;
  observe(listener: () => void): () => void;
}
export type LoginState = {
  step: LoginStep; email: string; busy: boolean; error: string; message: string;
  session: LoginSession | null;
};
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 12) return "Velg et passord med minst 12 tegn. En lang setning fungerer fint.";
  if (password.length > 128) return "Passordet kan ha opptil 128 tegn.";
  if (password !== confirmation) return "Passordene er ikke like. Skriv det samme passordet i begge feltene.";
  return "";
}
export function loginError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "E-postadressen eller passordet er feil. Prøv igjen, eller velg Glemt passord.";
  if (code === "auth/email-already-in-use") return "Kontoen finnes allerede. Logg inn, eller velg Glemt passord.";
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") return "Passordet oppfyller ikke kravene. Velg et lengre passord.";
  if (code === "auth/too-many-requests" || code === "functions/resource-exhausted") return "Det har vært mange forsøk. Vent litt før du prøver igjen.";
  if (code === "functions/permission-denied" || code === "auth/user-disabled") return "Denne kontoen har ikke tilgang til kokeboken.";
  if (code === "auth/network-request-failed" || code === "functions/unavailable") return "Kunne ikke koble til. Sjekk nettilkoblingen og prøv igjen.";
  if (code === "functions/failed-precondition" || code === "auth/operation-not-allowed" || code === "auth/invalid-api-key" || code === "auth/configuration-not-found") return "Innloggingen er ikke klar ennå. Prøv igjen senere.";
  return "Noe gikk galt med innloggingen. Prøv igjen om litt.";
}

export class EmailLoginController {
  private value: LoginState = { step: "email", email: "", busy: false, error: "", message: "", session: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  public readonly auth: EmailAuthService;
  constructor(auth: EmailAuthService) { this.auth = auth; }
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<LoginState>) { this.value = { ...this.value, ...patch }; for (const listener of this.listeners) listener(); }
  private async run(operation: () => Promise<void>) {
    if (this.value.busy || !this.auth.configured) return;
    this.update({ busy: true, error: "", message: "" });
    try { await operation(); } catch (error) { this.update({ error: loginError(error) }); }
    finally { this.update({ busy: false }); }
  }
  async continueWithEmail(input: string) {
    const email = normalizeEmail(input);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { this.update({ error: "Skriv inn en gyldig e-postadresse." }); return; }
    await this.run(async () => { const step = await this.auth.lookup(email); this.update({ email, step }); });
  }
  private async accept(session: LoginSession) {
    if (session.verified) await this.auth.authorize();
    this.update({ session, email: session.email, step: session.verified ? "ready" : "verify" });
  }
  async create(password: string, confirmation: string) {
    const error = validateNewPassword(password, confirmation);
    if (error) { this.update({ error }); return; }
    if (this.value.step !== "create") return;
    await this.run(async () => {
      try {
        const result = await this.auth.createAccount(this.value.email, password);
        await this.accept(result.session);
        this.update({ message: result.verificationSent ? "Vi har sendt en bekreftelseslenke til e-postadressen din." : "Passordet er opprettet. Vi klarte ikke å sende bekreftelsen; prøv Send ny lenke." });
      } catch (error) {
        if ((error as { code?: string }).code === "auth/email-already-in-use") this.update({ step: "login" });
        throw error;
      }
    });
  }
  async signIn(password: string) {
    if (!password) { this.update({ error: "Skriv inn passordet ditt." }); return; }
    if (this.value.step !== "login") return;
    await this.run(async () => { await this.accept(await this.auth.signIn(this.value.email, password)); });
  }
  async resetPassword() {
    if (!["login", "set-password"].includes(this.value.step)) return;
    await this.run(async () => { await this.auth.sendPasswordReset(this.value.email); this.update({ message: "Vi har sendt en lenke til e-postadressen din. Bruk den til å velge et nytt passord." }); });
  }
  async resendVerification() {
    if (this.value.step !== "verify") return;
    await this.run(async () => { await this.auth.sendVerification(); this.update({ message: "En ny bekreftelseslenke er sendt." }); });
  }
  async refreshVerification() {
    if (this.value.step !== "verify") return;
    await this.run(async () => {
      const session = await this.auth.session(true);
      if (!session) { this.update({ step: "email", session: null }); return; }
      await this.accept(session);
      if (!session.verified) this.update({ message: "E-postadressen er ikke bekreftet ennå. Åpne lenken i e-posten først." });
    });
  }
  async restore() {
    if (!this.auth.configured || this.value.busy) return;
    const generation = ++this.generation;
    try {
      const session = await this.auth.session();
      if (generation !== this.generation || this.value.busy) return;
      if (session) {
        if (session.verified) await this.auth.authorize();
        if (generation !== this.generation || this.value.busy) return;
        this.update({ session, email: session.email, step: session.verified ? "ready" : "verify" });
      } else if (this.value.session) this.update({ step: "email", session: null, email: "", message: "", error: "" });
    } catch (error) {
      if (generation === this.generation && !this.value.busy) this.update({ step: "email", session: null, error: loginError(error) });
    }
  }
  back() { if (this.value.busy) return; this.generation++; this.update({ step: "email", session: null, message: "", error: "" }); }
  async signOut() { this.generation++; await this.run(async () => { await this.auth.signOut(); this.update({ step: "email", session: null, email: "", message: "", error: "" }); }); }
}
