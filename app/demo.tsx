import { useEffect } from "react";
import Cookbook from "./cookbook";
import { setBackend } from "@/lib/backend";
import { createDemoBackend } from "@/lib/demo-backend";

const demo = createDemoBackend();
setBackend(demo);

export default function Demo() {
  useEffect(() => () => { demo.dispose(); setBackend(null); }, []);
  return <>
    <div className="preview-notice" role="status">Forhåndsvisning · Endringer lagres bare mens siden er åpen. Innlogging og felles lagring er ikke tilkoblet.</div>
    <Cookbook displayName="Isak" onSignOut={() => { demo.dispose(); setBackend(null); location.search = ""; }}/>
  </>;
}
