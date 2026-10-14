import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/caveat/600.css";

// The explicit demo build opens the disposable sample-data backend. A regular
// production build keeps the real sign-in screen and excludes the demo module.
const publicDemo = import.meta.env.VITE_COOKBOOK_DEMO === "1";
const preview = publicDemo || (import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(location.hostname)
  && new URLSearchParams(location.search).get("preview") === "1");
const Demo = (import.meta.env.DEV || publicDemo) ? lazy(() => import("./demo")) : null;
const Entrance = publicDemo ? null : lazy(() => import("./entrance"));
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<main className="entrance"><p className="loading-state">Åpner kokeboken …</p></main>}>
    {preview && Demo ? <Demo/> : Entrance ? <Entrance/> : null}
  </Suspense>
);
