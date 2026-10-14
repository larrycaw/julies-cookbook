import { useEffect } from "react";
import Cookbook from "./cookbook";
import { setBackend } from "@/lib/backend";
import { createDemoBackend } from "@/lib/demo-backend";

const demo = createDemoBackend();
setBackend(demo);

export default function Demo() {
  useEffect(() => () => { demo.dispose(); setBackend(null); }, []);
  return <>
    <div className="preview-notice" role="status">Demo · Prøv oppskrifter, porsjoner, bilder og handleliste. Endringer forsvinner når du laster siden på nytt.</div>
    <Cookbook displayName="dere" demoMode sessionActionLabel="Nullstill demo" onSignOut={() => { demo.dispose(); setBackend(null); location.reload(); }}/>
  </>;
}
