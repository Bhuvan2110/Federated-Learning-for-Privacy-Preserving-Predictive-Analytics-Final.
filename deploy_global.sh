#!/bin/bash
set -e

echo "========================================================"
echo "  FL Platform — Global Deploy via Cloudflare Tunnel"
echo "  Free • No account • No credit card"
echo "========================================================"

cd /home/bhuvans/Documents/final

# ── Step 1: Install cloudflared ───────────────────────────
CF_BIN="$HOME/.local/bin/cloudflared"
mkdir -p "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v cloudflared &>/dev/null; then
    echo ""
    echo "[1/5] Installing cloudflared..."
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
    else
        echo "  ERROR: Unsupported architecture: $ARCH"
        exit 1
    fi
    curl -fsSL "$CF_URL" -o "$CF_BIN"
    chmod +x "$CF_BIN"
    echo "  cloudflared installed at $CF_BIN"
else
    echo "[1/5] cloudflared already installed: $(cloudflared --version)"
fi

# ── Step 2: Ensure Docker is running ─────────────────────
echo ""
echo "[2/5] Ensuring Docker service is active..."
usermod -aG docker bhuvans 2>/dev/null || true
chmod 666 /var/run/docker.sock 2>/dev/null || true
systemctl start docker

# ── Step 3: Ensure Python package structure ───────────────
echo ""
echo "[3/5] Verifying Python package structure..."
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/db/__init__.py
touch backend/app/core/__init__.py
touch backend/app/ml/__init__.py

# ── Step 4: Start Docker stack ────────────────────────────
echo ""
echo "[4/5] Starting Docker stack..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache backend
docker compose up -d

# Wait for nginx/frontend on port 80
echo "  Waiting for services to become ready on port 80..."
for i in $(seq 1 30); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/ 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
        echo "  ✔ Services ready (HTTP $STATUS)"
        break
    fi
    echo "  Attempt $i/30 — HTTP $STATUS (waiting...)"
    sleep 5
done

# ── Step 5: Launch Cloudflare Tunnel ─────────────────────
echo ""
echo "[5/5] Starting Cloudflare Tunnel..."
echo "  (Your public URL will appear below — it takes ~5 seconds)"
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  Look for a line like:                              │"
echo "  │  https://XXXX-XXXX-XXXX.trycloudflare.com          │"
echo "  │                                                     │"
echo "  │  That URL is live globally — share it freely!       │"
echo "  │                                                     │"
echo "  │  Press Ctrl+C to stop the tunnel and shut down.     │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""

# Run tunnel in foreground (URL is printed to stderr)
cloudflared tunnel --url http://localhost:80 2>&1 | \
    grep --line-buffered -E "(trycloudflare\.com|ERR|failed|error)" &

TUNNEL_PID=$!

# Graceful shutdown on Ctrl+C
trap 'echo ""; echo "Shutting down..."; kill $TUNNEL_PID 2>/dev/null; docker compose down; echo "Done."; exit 0' SIGINT SIGTERM

wait $TUNNEL_PID
