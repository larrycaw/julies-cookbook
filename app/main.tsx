import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import EmailLogin from "./email-login";
import { emailAuth } from "@/lib/auth-config";
import "./globals.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/caveat/600.css";

function Entrance() { return <EmailLogin auth={emailAuth}/>; }

// Preview exists only in Vite development on this machine. Production is locked
// until the real identity and storage adapter has been configured and verified.
const preview = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(location.hostname)
  && new URLSearchParams(location.search).get("preview") === "1";
const Demo = import.meta.env.DEV ? lazy(() => import("./demo")) : null;
createRoot(document.getElementById("root")!).render(
  preview && Demo ? <Suspense fallback={<Entrance/>}><Demo/></Suspense> : <Entrance/>
);
