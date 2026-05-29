#!/bin/bash
# keep_tunnel.sh — auto-restarts cloudflared if it dies
export PATH="$HOME/.local/bin:$PATH"

while true; do
  echo "[$(date)] Starting cloudflared tunnel..."
  cloudflared tunnel --url http://localhost:80 2>&1 | tee /tmp/cloudflared.log &
  TUNNEL_PID=$!

  # Wait for URL and print it
  for i in $(seq 1 30); do
    URL=$(grep -o 'https://[^ ]*trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
    if [ -n "$URL" ]; then
      echo ""
      echo "============================================"
      echo "  🌍 PUBLIC URL: $URL"
      echo "============================================"
      break
    fi
    sleep 2
  done

  # Wait for tunnel process to die
  wait $TUNNEL_PID
  echo "[$(date)] Tunnel died. Restarting in 10 seconds..."
  sleep 10
done
