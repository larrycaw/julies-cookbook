import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const repo = "larrycaw/julies-kokebok";
const remote = `https://github.com/${repo}.git`;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout.trim();
}

try {
  run("gh", ["auth", "status"]);
  const dirty = run("git", ["status", "--porcelain"]);
  if (dirty) throw new Error("Commit endringene før publisering. Skriptet publiserer bare gjeldende commit.");
  run("git", ["rev-parse", "--verify", "HEAD"]);
  const lookup = spawnSync("gh", ["api", `repos/${repo}`], { cwd: root, encoding: "utf8" });
  if (lookup.error) throw lookup.error;
  if (lookup.status !== 0) {
    if (!(lookup.stderr || "").includes("HTTP 404")) throw new Error(lookup.stderr || "Kunne ikke undersøke repositoryet.");
    run("gh", ["repo", "create", repo, "--public", "--description", "Julies digitale kokebok"]);
  }
  // Normal push refuses unrelated history and never force-overwrites main.
  run("git", ["push", remote, "HEAD:main"], { stdio: "inherit" });
  const pages = spawnSync("gh", ["api", `repos/${repo}/pages`], { cwd: root, encoding: "utf8" });
  if (pages.error) throw pages.error;
  if (pages.status !== 0) {
    if (!(pages.stderr || "").includes("HTTP 404")) throw new Error(pages.stderr || "Kunne ikke undersøke Pages-oppsettet.");
    run("gh", ["api", `repos/${repo}/pages`, "--method", "POST", "-f", "build_type=workflow"]);
  } else if (JSON.parse(pages.stdout).build_type !== "workflow") {
    throw new Error("Repositoryet bruker allerede et annet Pages-oppsett. Velg GitHub Actions i Settings → Pages før videre publisering.");
  }
  run("gh", ["workflow", "run", "pages.yml", "--repo", repo, "--ref", "main"]);
  console.log(`Publisering startet. Følg arbeidsflyten på https://github.com/${repo}/actions`);
  console.log("Google-innlogging og felles lagring må kobles til før inngangen kan åpnes.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
