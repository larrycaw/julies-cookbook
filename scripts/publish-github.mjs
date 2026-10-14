import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const repo = "larrycaw/julies-cookbook";
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
  run("gh", ["repo", "view", repo, "--json", "nameWithOwner"]);
  // Normal push refuses unrelated history and never force-overwrites main.
  run("git", ["-c", "credential.helper=!gh auth git-credential", "push", remote, "HEAD:main"], { stdio: "inherit" });
  console.log(`Publisering startet. Følg arbeidsflyten på https://github.com/${repo}/actions`);
  console.log("E-postinnlogging og felles lagring må kobles til før kokeboken kan åpnes.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
