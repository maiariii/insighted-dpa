#!/usr/bin/env python3
import subprocess
import os
import sys
import threading
import time
import tarfile

# Handle Windows console encoding for emojis
if sys.platform == "win32":
    import codecs
    sys.stdout.reconfigure(encoding='utf-8')

# --- CONFIGURATION ---
SERVER_IP = "20.24.58.49"
SERVER_DIR = "/mnt/insighted-dpa"
USER = "Administrator1"
TAR_FILE = "dpa-deploy.tmp.tar.gz"
PORT = 5040
PM2_NAME = "insighted-dpa-backend"
ECOSYSTEM_CONFIG = "ecosystem.dpa.config.cjs"

INCLUDE = [
    "server", "src", "public", "index.html", "package.json", "package-lock.json", 
    ".env", ECOSYSTEM_CONFIG, "InsightED logo APP.png", "APP.png"
]

# --- COLORS ---
GREEN = '\033[0;32m'
RED = '\033[0;31m'
CYAN = '\033[0;36m'
YELLOW = '\033[1;33m'
NC = '\033[0m'

def info(msg): print(f"{CYAN}ℹ️  {msg}{NC}", flush=True)
def success(msg): print(f"{GREEN}✅ {msg}{NC}", flush=True)
def warn(msg): print(f"{YELLOW}⚠️  {msg}{NC}", flush=True)
def error(msg): print(f"{RED}❌ {msg}{NC}", flush=True)

# Standard SSH options with BatchMode and server keepalive
SSH_OPTS = [
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=30",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=4"
]

def run_command(cmd, capture=False, timeout=90, retries=5, delay=3):
    cmd_str = cmd if isinstance(cmd, str) else ' '.join(cmd)
    
    is_network = "ssh" in cmd_str or "scp" in cmd_str
    max_attempts = retries if is_network else 1

    for attempt in range(1, max_attempts + 1):
        if not capture:
            prefix = f"[Attempt {attempt}/{max_attempts}] " if is_network else ""
            print(f"{CYAN}> {prefix}Running: {cmd_str}{NC}", flush=True)
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=capture, text=True, 
                timeout=timeout, stdin=subprocess.DEVNULL
            )
            if result.returncode == 0:
                return result
            if attempt < max_attempts:
                warn(f"Command returned exit code {result.returncode}. Retrying in {delay}s...")
        except subprocess.TimeoutExpired:
            if attempt < max_attempts:
                warn(f"Command timed out after {timeout}s. Retrying in {delay}s...")
        
        if attempt < max_attempts:
            time.sleep(delay)

    if not capture:
        error(f"Command failed after {max_attempts} attempts: {cmd_str}")
    return subprocess.CompletedProcess(cmd, 1, "", "Failed after retries")

def pre_flight_audit():
    print(f"\n{YELLOW}🔍 Phase 1: Pre-flight Audit{NC}", flush=True)
    ssh_target = f"{USER}@{SERVER_IP}"
    ssh_base = ["ssh"] + SSH_OPTS + [ssh_target]
    
    info("Checking remote disk space...")
    res = run_command(ssh_base + ["df -h / | tail -1"], capture=True, timeout=20, retries=3)
    if res.returncode == 0:
        parts = res.stdout.split()
        if len(parts) >= 5:
            usage = parts[4].replace('%', '')
            info(f"Remote disk usage: {usage}%")
            if int(usage) > 90:
                warn("Disk space is critically low (>90%)!")
    else:
        warn("Could not check disk space (transient network glitch). Skipping...")
    
    info(f"Checking if port {PORT} is occupied...")
    res = run_command(ssh_base + [f"ss -tulpn | grep :{PORT} || true"], capture=True, timeout=20, retries=3)
    if res.returncode == 0 and res.stdout.strip():
        info(f"Port {PORT} is active for PM2 backend.")
    else:
        info(f"Port {PORT} ready.")

def prepare_remote():
    print(f"\n{YELLOW}🧹 Phase 2: Preparing remote directory {SERVER_DIR}...{NC}", flush=True)
    ssh_target = f"{USER}@{SERVER_IP}"
    prep_cmd = f"sudo mkdir -p {SERVER_DIR} && sudo chown -R {USER}:{USER} {SERVER_DIR} && mkdir -p {SERVER_DIR}/logs"
    ssh_cmd = ["ssh"] + SSH_OPTS + [ssh_target, prep_cmd]
    run_command(ssh_cmd, retries=5)
    success("Remote directory prepared.")

def post_flight_verify():
    print(f"\n{YELLOW}🔍 Phase 5: Post-flight Verification & Auto-Revive{NC}", flush=True)
    ssh_target = f"{USER}@{SERVER_IP}"
    
    info("Checking PM2 status...")
    show_cmd = ["ssh"] + SSH_OPTS + [ssh_target, f"pm2 show {PM2_NAME} | grep status"]
    res = run_command(show_cmd, capture=True, retries=3)
    print(res.stdout, flush=True)

    if "errored" in res.stdout or "stopped" in res.stdout:
        warn("PM2 process detected in errored/stopped state! Triggering Auto-Revive restart...")
        revive_cmd = ["ssh"] + SSH_OPTS + [ssh_target, f"pm2 restart {PM2_NAME} --update-env"]
        run_command(revive_cmd, retries=3)
        success("Auto-Revive triggered for PM2 process.")
    
    info(f"Checking backend endpoint (port {PORT})...")
    health_cmd = ["ssh"] + SSH_OPTS + [ssh_target, f"curl -sf http://127.0.0.1:{PORT}/ || true"]
    run_command(health_cmd, capture=False, retries=3)

def main():
    start_time = time.time()
    print(f"{CYAN}" + "="*60 + f"{NC}", flush=True)
    print(f"{GREEN}🚀 InsightEd DPA Deployment: {PM2_NAME}{NC}", flush=True)
    print(f"{CYAN}Target Path: {SERVER_DIR} | Port: {PORT}{NC}", flush=True)
    print(f"{CYAN}" + "="*60 + f"{NC}", flush=True)

    # 1. Pre-flight
    pre_flight_audit()

    # 2. Prepare Remote Directory
    prepare_remote()

    # 3. Create Payload Archive
    print(f"\n{YELLOW}📦 Phase 3: Creating payload archive -> {TAR_FILE}...{NC}", flush=True)
    existing_includes = [item for item in INCLUDE if os.path.exists(item)]
    
    def exclude_filter(tarinfo):
        name = tarinfo.name.lower()
        if any(x in name for x in ["node_modules", ".git", ".turbo"]):
            return None
        return tarinfo

    with tarfile.open(TAR_FILE, "w:gz") as tar:
        for f in existing_includes:
            tar.add(f, filter=exclude_filter)
            info(f"       + {f}")
            
    success("Payload archive created.")

    # 4. Upload & Deploy with Auto-Revive Retry Loop
    print(f"\n{YELLOW}📤 Phase 4: Uploading archive and executing remote deploy in {SERVER_DIR}...{NC}", flush=True)
    ssh_target = f"{USER}@{SERVER_IP}"
    
    scp_cmd = ["scp", "-q"] + SSH_OPTS + [TAR_FILE, f"{ssh_target}:{SERVER_DIR}/"]
    run_command(scp_cmd, retries=5)
    
    ecosystem_remote_path = f"{SERVER_DIR}/{ECOSYSTEM_CONFIG}"
    remote_setup = (
        f"cd {SERVER_DIR} && "
        f"pm2 stop {PM2_NAME} 2>/dev/null || true && "
        f"tar -xzf {TAR_FILE} && "
        f"sudo chown -R {USER}:{USER} {SERVER_DIR} && "
        "export PATH=$PATH:/usr/local/bin:/home/Administrator1/.local/share/pnpm; "
        "echo '       -> Running production npm install...' && "
        "npm install --omit=dev --legacy-peer-deps --prefer-offline 2>&1 | tail -n 10 && "
        f"pm2 flush {PM2_NAME} 2>/dev/null || true; "
        f"pm2 delete {PM2_NAME} 2>/dev/null || true; "
        f"pm2 start {ecosystem_remote_path} --update-env && "
        f"rm -f {TAR_FILE}"
    )
    ssh_deploy_cmd = ["ssh"] + SSH_OPTS + [ssh_target, remote_setup]
    run_command(ssh_deploy_cmd, retries=5, timeout=180)
    success("Remote setup complete.")

    # 5. Verify & Auto-Revive
    post_flight_verify()

    # 6. Local Cleanup
    try:
        if os.path.exists(TAR_FILE):
            os.remove(TAR_FILE)
            info("Local temporary payload archive removed.")
    except Exception:
        pass

    duration = time.time() - start_time
    print(f"\n{GREEN}" + "="*60 + f"{NC}")
    success(f"Deployment to {SERVER_DIR} Complete in {duration:.2f}s!")
    print(f"{GREEN}" + "="*60 + f"{NC}")

if __name__ == "__main__":
    main()