import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowLeft, BookOpen, Heart, LockKeyhole, LoaderCircle, Mail, Check } from "lucide-react";
import { EmailLoginController, type EmailAuthService } from "@/lib/email-login";

export default function EmailLogin({ auth }: { auth: EmailAuthService }) {
  const controller = useMemo(() => new EmailLoginController(auth), [auth]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => { setPassword(""); setConfirmation(""); }, [state.step, state.email]);
  useEffect(() => {
    void controller.restore();
    const unsubscribe = auth.observe(() => { void controller.restore(); });
    const focus = () => { if (controller.getSnapshot().step === "verify") void controller.refreshVerification(); else void controller.restore(); };
    window.addEventListener("focus", focus);
    return () => { unsubscribe(); window.removeEventListener("focus", focus); };
  }, [auth, controller]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state.step === "email") await controller.continueWithEmail(email);
    else if (state.step === "create") await controller.create(password, confirmation);
    else if (state.step === "login") await controller.signIn(password);
    setPassword(""); setConfirmation("");
  }
  const title = state.step === "create" ? "Velg ditt første passord" : state.step === "login" ? "Velkommen tilbake" : state.step === "verify" ? "Sjekk e-posten din" : state.step === "set-password" ? "Opprett et passord" : state.step === "ready" ? "Du er logget inn" : "Julies kokebok";
  return <main className="entrance"><div className="entrance-card">
    <span className="brand-icon"><BookOpen size={31}/><Heart size={12} className="brand-heart" fill="currentColor"/></span>
    <p className="eyebrow">BARE FOR JULIE & ISAK</p>
    <h1>{title}<span className="brand-dot">.</span></h1>
    {state.step === "email" ? <p>Et lite sted for store matminner.<br/>Skriv inn e-postadressen din for å fortsette.</p> : <p className="login-email">{state.email}</p>}
    {!auth.configured && <p className="inline-status" role="status">Innloggingen åpner når kokeboken er klar.</p>}
    {["email", "create", "login"].includes(state.step) && <form className="login-form" onSubmit={submit}>
      {state.step === "email" ? <label className="field">E-postadresse<input type="email" name="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="din@epost.no" disabled={state.busy}/></label> : <>
        {state.step === "create" && <p className="login-help">Dette er første gang du bruker kokeboken. Velg et passord du vil bruke når du kommer tilbake.</p>}
        <label className="field">{state.step === "create" ? "Nytt passord" : "Passord"}<input type="password" name="password" autoComplete={state.step === "create" ? "new-password" : "current-password"} required minLength={state.step === "create" ? 12 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={state.busy} aria-describedby={state.step === "create" ? "password-help" : undefined}/></label>
        {state.step === "create" && <><p className="login-help" id="password-help">Minst 12 tegn. Bruk gjerne en lang setning.</p><label className="field">Bekreft passord<input type="password" name="password-confirmation" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={state.busy}/></label></>}
      </>}
      <button className="button primary full-width" disabled={state.busy || !auth.configured}>{state.busy && <LoaderCircle className="spin" size={17}/>} {state.step === "email" ? "Fortsett" : state.step === "create" ? "Opprett passord" : "Logg inn"}</button>
    </form>}
    {state.step === "login" && <button className="text-button login-link" disabled={state.busy} onClick={() => void controller.resetPassword()}>Glemt passord?</button>}
    {state.step === "set-password" && <><p className="login-help">E-postadressen din er allerede registrert uten passord. Vi sender en lenke der du kan velge et passord.</p><button className="button primary full-width" disabled={state.busy} onClick={() => void controller.resetPassword()}><Mail size={17}/> Send lenke for å opprette passord</button><button className="text-button login-link" disabled={state.busy} onClick={() => controller.back()}>Tilbake til innlogging</button></>}
    {state.step === "verify" && <><p className="login-help">Passordet er opprettet. Bekreft e-postadressen med lenken i e-posten før du åpner kokeboken. Sjekk også søppelpost.</p><button className="button primary full-width" disabled={state.busy} onClick={() => void controller.refreshVerification()}><Check size={17}/> Jeg har bekreftet e-posten</button><button className="text-button login-link" disabled={state.busy} onClick={() => void controller.resendVerification()}>Send ny lenke</button></>}
    {state.step === "ready" && <p className="inline-status" role="status">Innloggingen din er klar. Vi klargjør fortsatt oppskriftene og den felles handlelisten.</p>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.message && <p className="inline-status" role="status">{state.message}</p>}
    {["create", "login"].includes(state.step) && <button className="text-button login-link" disabled={state.busy} onClick={() => controller.back()}><ArrowLeft size={14}/> Bruk en annen e-postadresse</button>}
    {["verify", "ready"].includes(state.step) && <button className="text-button login-link" disabled={state.busy} onClick={() => void controller.signOut()}>Logg ut</button>}
    <p className="entrance-note"><LockKeyhole size={13}/> Kokeboken er privat for dere to.</p>
  </div></main>;
}
