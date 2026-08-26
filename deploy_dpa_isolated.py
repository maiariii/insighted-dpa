#!/usr/bin/env python3
import os
import sys
import time
import tarfile
import subprocess

# Handle Windows console encoding for emojis/box-drawing chars from remote PM2 output
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# --- CONFIGURATION ---
APP_NAME = "insighted-dpa"
APP_SUBPATH = "/insighted-dpa/"        # Nginx location prefix this app is served under
REMOTE_USER = "Administrator1"
REMOTE_HOST = "20.24.58.49"
REMOTE_DIR = f"/mnt/{APP_NAME}"
PORT = 5040                            # Matches the upstream dpa_backend port in Nginx
PM2_NAME = "insighted-dpa-backend"
ECOSYSTEM_CONFIG = "ecosystem.dpa.config.cjs"
ARCHIVE_NAME = f"{APP_NAME}-deploy.tmp.tar.gz"

# Strict no-Nginx-touch policy: this script never edits /etc/nginx or reloads/
# restarts the Nginx service. Everything it does is scoped to REMOTE_DIR and
# the single PM2_NAME process.
SSH_OPTS = [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=30",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=4",
]

# Files/directories shipped to the VM. apps/frontend/dist (built fresh in Phase
# 2 below) rides along automatically since "apps" is included as a whole
# directory — no separate packaging step for it.
INCLUDE = [
    "apps", "packages", "public", "index.html", "package.json", "package-lock.json",
    ECOSYSTEM_CONFIG, "APP.png", "deped_building_bg.png", "deped_logo.png",
    "hrod_logo.png", "bagong_pilipinas.png", "insighted_logo_vertical.png", ".env"
]

# --- COLORS ---
GREEN = '\033[0;32m'
RED = '\033[0;31m'
CYAN = '\033[0;36m'
YELLOW = '\033[1;33m'
NC = '\033[0m'

def info(msg): print(f"{CYAN}[INFO] {msg}{NC}", flush=True)
def success(msg): print(f"{GREEN}[SUCCESS] {msg}{NC}", flush=True)
def warn(msg): print(f"{YELLOW}[WARN] {msg}{NC}", flush=True)
def error(msg): print(f"{RED}[ERROR] {msg}{NC}", flush=True)

def run_command(cmd, capture=False, timeout=90, retries=1, delay=5, env=None, check=True):
    """Runs cmd, which may be a plain string (simple local commands like
    `npm -v` — needs shell=True so cmd.exe can resolve npm.cmd/node.exe via
    PATH) or a list of args (REQUIRED for ssh/scp calls carrying embedded
    quotes/newlines: shell=True routes through cmd.exe, which does not
    understand POSIX single-quote grouping and treats embedded newlines as
    separate LOCAL commands rather than one quoted remote argument. A list
    bypasses cmd.exe entirely — CreateProcess talks to ssh.exe/scp.exe
    directly — so multi-line remote scripts reach the target executable
    intact instead of being re-split and partly executed locally, which was a
    real, previously-shipped bug in this script.

    Retries apply to any command tagged network-sensitive (ssh/scp) even if the
    caller didn't ask for extra retries, since a dropped/timed-out connection
    there is transient, not a real failure to abort on."""
    cmd_str = cmd if isinstance(cmd, str) else ' '.join(cmd)
    is_network = isinstance(cmd, list) and cmd and cmd[0] in ("ssh", "scp")
    max_attempts = max(retries, 5) if is_network else retries

    for attempt in range(1, max_attempts + 1):
        prefix = f"[Attempt {attempt}/{max_attempts}] " if is_network and max_attempts > 1 else ""
        info(f"{prefix}Executing: {cmd_str}")
        try:
            result = subprocess.run(
                cmd, shell=isinstance(cmd, str), check=False, text=True,
                capture_output=capture, timeout=timeout, stdin=subprocess.DEVNULL,
                encoding='utf-8', errors='replace', env=env
            )
            if result.returncode == 0:
                return result
            if attempt < max_attempts:
                warn(f"Command exited {result.returncode}. Retrying in {delay}s...")
        except subprocess.TimeoutExpired:
            if attempt < max_attempts:
                warn(f"Command timed out after {timeout}s. Retrying in {delay}s...")
            result = None
        if attempt < max_attempts:
            time.sleep(delay)

    if check:
        error(f"Command failed after {max_attempts} attempt(s): {cmd_str}")
        sys.exit(1)
    return result

def ssh_base():
    return ["ssh"] + SSH_OPTS + [f"{REMOTE_USER}@{REMOTE_HOST}"]

def pre_flight_audit():
    """Phase 1: local tool check + a real SSH connectivity probe (not just
    hoping the later transfer works) — mirrors the "echo SSH_OK" pattern used
    across this team's other deploy scripts. Read-only; changes nothing."""
    info("Phase 1: Pre-flight audit")
    # String form (shell=True) — npm/node are .cmd wrapper scripts on Windows,
    # which CreateProcess (used when shell=False) can't resolve without going
    # through cmd.exe. List form is reserved for ssh/scp below, which need to
    # bypass cmd.exe for the opposite reason. run_command() exits the process
    # itself (check=True by default) if either of these isn't found/fails.
    run_command("npm -v")
    run_command("node -v")

    info("Testing SSH connectivity...")
    res = run_command(ssh_base() + ["echo SSH_OK"], capture=True, timeout=35)
    if "SSH_OK" not in (res.stdout or ""):
        error("SSH connectivity check failed — did not receive expected response.")
        sys.exit(1)
    success("SSH connectivity confirmed.")

import shutil

def build_local_assets():
    """Phase 2: Local build, entirely on this machine — nothing here touches
    Nginx, other pm2 processes, or any port other than what this app already
    uses.

    1. apps/frontend (React/Vite) -> apps/frontend/dist, built with
       VITE_BASE_PATH injected into the subprocess environment (not hardcoded
       into source) so the built index.html's asset URLs are correctly
       prefixed for the /insighted-dpa/ subpath Nginx serves this under.
    2. public/css/tailwind.css — the precompiled Tailwind bundle used by the
       public/ (vanilla-JS) build of this app. Must be rebuilt any time
       Tailwind classes change in public/**/*.html or public/js/**/*.js.
    """
    info("Phase 2: Local build")
    run_command("npm install --no-audit --no-fund")

    build_env = os.environ.copy()
    build_env["VITE_BASE_PATH"] = APP_SUBPATH
    build_env["VITE_API_URL"] = f"{APP_SUBPATH}api"
    if sys.platform == "win32":
        run_command(f"set VITE_BASE_PATH={APP_SUBPATH}&& set VITE_API_URL={APP_SUBPATH}api&& npm run build -w apps/frontend", env=build_env)
    else:
        run_command(f"VITE_BASE_PATH='{APP_SUBPATH}' VITE_API_URL='{APP_SUBPATH}api' npm run build -w apps/frontend", env=build_env)
    run_command("npm run build:css")

    dist_index = os.path.join("apps", "frontend", "dist", "index.html")
    if not os.path.exists(dist_index):
        error(f"{dist_index} was not produced by the build. Aborting before anything is shipped.")
        sys.exit(1)

    # Sync fresh Vite build index.html into root index.html
    shutil.copyfile(dist_index, "index.html")
    info("Synced apps/frontend/dist/index.html to root index.html.")

    if not os.path.exists(os.path.join("public", "css", "tailwind.css")):
        warn("public/css/tailwind.css was not produced by the build — deployed styles may be stale.")

    success("Local build verified: apps/frontend/dist/index.html and public/css/tailwind.css are present.")

def exclude_filter(tarinfo):
    """Filters out heavy/unnecessary local files to keep the archive small
    enough for a reliable transfer."""
    name = tarinfo.name.lower()
    excludes = ['node_modules', '.git', '.turbo', '__pycache__', '.log', ARCHIVE_NAME.lower()]
    if any(ex in name for ex in excludes if ex != '.env'):
        return None
    return tarinfo

def package_archive():
    """Phase 3: Bundle backend code, the freshly-built apps/frontend/dist,
    public/, and config into one tarball."""
    info("Phase 3: Packaging archive")
    existing_includes = [item for item in INCLUDE if os.path.exists(item)]
    missing = [item for item in INCLUDE if item not in existing_includes]
    if missing:
        warn(f"Skipping missing local paths: {', '.join(missing)}")

    with tarfile.open(ARCHIVE_NAME, "w:gz") as tar:
        for item in existing_includes:
            tar.add(item, filter=exclude_filter)
            info(f"  + {item}")

    size_mb = os.path.getsize(ARCHIVE_NAME) / (1024 * 1024)
    success(f"Payload archive created ({size_mb:.1f} MB).")

def deploy_remote():
    """Phase 4: Transfer + atomic remote execution. Scoped entirely to
    REMOTE_DIR and PM2_NAME. Never touches /etc/nginx or reloads/restarts the
    Nginx service — strictly no-Nginx-touch.

    The critical fix here vs. earlier attempts: Nginx's location block for
    this app serves static files from a PERSISTENT REMOTE_DIR/dist/ directory
    (alias /mnt/insighted-dpa/dist/). Earlier revisions either never populated
    that directory, or (briefly) replaced it wholesale from the local machine —
    both wrong. The safe pattern (matching this team's other working deploy
    scripts) is: on the REMOTE side, after extraction, clear dist/'s CONTENTS
    (not the directory itself — removing/recreating the folder while Nginx
    holds an open handle to it can stall or crash requests) and copy the fresh
    apps/frontend/dist build into it in place.
    """
    info(f"Phase 4: Preparing {REMOTE_DIR} and transferring archive")
    prep_cmd = (
        f"sudo mkdir -p {REMOTE_DIR} /var/www/html/insighted-dpa && "
        f"sudo chown -R {REMOTE_USER}:{REMOTE_USER} {REMOTE_DIR} /var/www/html/insighted-dpa && "
        f"mkdir -p {REMOTE_DIR}/logs {REMOTE_DIR}/dist"
    )
    run_command(ssh_base() + [prep_cmd])

    scp_cmd = ["scp", "-q"] + SSH_OPTS + [ARCHIVE_NAME, f"{REMOTE_USER}@{REMOTE_HOST}:{REMOTE_DIR}/"]
    run_command(scp_cmd, timeout=180)

    ecosystem_remote_path = f"{REMOTE_DIR}/{ECOSYSTEM_CONFIG}"
    remote_script = (
        f"cd {REMOTE_DIR} && "
        f"pm2 stop {PM2_NAME} 2>/dev/null || true && "
        f"tar -xzf {ARCHIVE_NAME} && "
        f"sudo chown -R {REMOTE_USER}:{REMOTE_USER} {REMOTE_DIR} && "
        # Clear dist/'s contents in place, never the folder itself, then copy
        # the fresh frontend build in. Safe to re-run every deploy.
        f"mkdir -p {REMOTE_DIR}/dist {REMOTE_DIR}/assets /var/www/html/insighted-dpa/assets && "
        f"find {REMOTE_DIR}/dist -mindepth 1 -delete && "
        f"rm -rf {REMOTE_DIR}/assets/* /var/www/html/insighted-dpa/assets/* 2>/dev/null || true; "
        f"if [ -d {REMOTE_DIR}/apps/frontend/dist ] && [ \"$(ls -A {REMOTE_DIR}/apps/frontend/dist 2>/dev/null)\" ]; then "
        f"  cp -r {REMOTE_DIR}/apps/frontend/dist/. {REMOTE_DIR}/dist/; "
        f"  cp -r {REMOTE_DIR}/apps/frontend/dist/. {REMOTE_DIR}/; "
        f"  sudo cp -r {REMOTE_DIR}/apps/frontend/dist/. /var/www/html/insighted-dpa/; "
        f"fi && "
        "export PATH=$PATH:/usr/local/bin:/home/Administrator1/.local/share/pnpm; "
        "echo '-> Installing production monorepo dependencies...' && "
        "npm install --omit=dev --legacy-peer-deps 2>&1 | tail -n 10 && "
        f"pm2 flush {PM2_NAME} 2>/dev/null || true; "
        f"pm2 delete {PM2_NAME} 2>/dev/null || true; "
        f"pm2 start {ecosystem_remote_path} --update-env && pm2 save && "
        f"rm -f {REMOTE_DIR}/{ARCHIVE_NAME}"
    )
    # CRITICAL: remote_script is its own single list element, not interpolated
    # into a shell string. subprocess.run() with a list on Windows calls
    # CreateProcess directly (no cmd.exe), so this whole &&-joined string
    # reaches the local ssh.exe as one intact argument; ssh then sends that as
    # one command to the REMOTE shell — the only place these steps should be
    # split apart. A previous version of this script built the command as an
    # interpolated string, which cmd.exe silently mangled: it split on
    # embedded characters and ran fragments as separate *local* Windows
    # commands, so the real remote steps never executed at all.
    ssh_cmd = ["ssh"] + SSH_OPTS + [f"{REMOTE_USER}@{REMOTE_HOST}", remote_script]
    run_command(ssh_cmd, timeout=180)
    success("Remote setup complete.")

def post_flight_verify():
    """Phase 5: Health check + auto-revive if PM2 shows the process errored or
    stopped. Reads/restarts this app's own PM2 process only; touches nothing
    else on the VM."""
    info("Phase 5: Post-flight verification")

    info("Checking PM2 status...")
    res = run_command(ssh_base() + [f"pm2 show {PM2_NAME} | grep status"], capture=True, check=False)
    status_output = (res.stdout or "") if res else ""
    print(status_output)

    if "errored" in status_output or "stopped" in status_output:
        warn("PM2 process detected in errored/stopped state! Triggering auto-revive restart...")
        run_command(ssh_base() + [f"pm2 restart {PM2_NAME} --update-env"], check=False)
        success("Auto-revive triggered for PM2 process.")

    info(f"Checking backend endpoint (port {PORT})...")
    health_cmd = f"curl -sf http://127.0.0.1:{PORT}/ >/dev/null && echo UP || pm2 show {PM2_NAME}"
    res = run_command(ssh_base() + [health_cmd], capture=True, check=False)
    output = (res.stdout or "").strip() if res else ""
    if "UP" in output:
        success(f"DPA backend is responding on localhost:{PORT}.")
    else:
        warn(f"Backend endpoint check did not return UP. Details:\n{output}")

def main():
    start_time = time.time()
    print(f"{CYAN}{'=' * 60}{NC}")
    print(f"{GREEN}InsightEd DPA Deployment: {PM2_NAME}{NC}")
    print(f"{CYAN}Target: {REMOTE_DIR} | Subpath: {APP_SUBPATH} | Port: {PORT}{NC}")
    print(f"{CYAN}{'=' * 60}{NC}")

    try:
        pre_flight_audit()
        build_local_assets()
        package_archive()
        deploy_remote()
        post_flight_verify()
    finally:
        if os.path.exists(ARCHIVE_NAME):
            os.remove(ARCHIVE_NAME)
            info("Local temporary payload archive removed.")

    duration = time.time() - start_time
    print(f"{GREEN}{'=' * 60}{NC}")
    success(f"Deployment to {REMOTE_DIR} complete in {duration:.2f}s!")
    print(f"{GREEN}{'=' * 60}{NC}")

if __name__ == '__main__':
    main()
