import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Heart, LockKeyhole } from "lucide-react";
import "./globals.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/caveat/600.css";

function Entrance() {
  return <main className="entrance">
    <div className="entrance-card">
      <span className="brand-icon"><BookOpen size={31}/><Heart size={12} className="brand-heart" fill="currentColor"/></span>
      <p className="eyebrow">BARE FOR JULIE & ISAK</p>
      <h1>Julies kokebok<span className="brand-dot">.</span></h1>
      <p>Et lite sted for store matminner.<br/>Oppskriftene våre, samlet med kjærlighet.</p>
      <div className="inline-status" role="status">Vi gjør kokeboken klar. Google-innlogging åpner når tilkoblingen er på plass.</div>
      <button className="button secondary full-width" disabled>Fortsett med Google</button>
      <p className="entrance-note"><LockKeyhole size={13}/> Kokeboken er privat for dere to.</p>
    </div>
  </main>;
}

// Preview exists only in Vite development on this machine. Production is locked
// until the real identity and storage adapter has been configured and verified.
const preview = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(location.hostname)
  && new URLSearchParams(location.search).get("preview") === "1";
const Demo = import.meta.env.DEV ? lazy(() => import("./demo")) : null;
createRoot(document.getElementById("root")!).render(
  preview && Demo ? <Suspense fallback={<Entrance/>}><Demo/></Suspense> : <Entrance/>
);
