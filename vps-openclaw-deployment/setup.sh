#!/usr/bin/env bash
set -euo pipefail

echo "=== WinBig OpenClaw VPS Setup ==="

# 1. Install Docker if missing
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  echo "Docker installed."
else
  echo "Docker already installed: $(docker --version)"
fi

# 2. Install Docker Compose plugin if missing
if ! docker compose version &>/dev/null; then
  echo "Installing Docker Compose plugin..."
  apt-get update -qq && apt-get install -y docker-compose-plugin
fi

echo "Docker Compose: $(docker compose version)"

# 3. Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo ">>> IMPORTANT: Edit .env with your real credentials before proceeding."
  echo ">>>   nano .env"
  echo ""
  exit 1
fi

# 4. Create nginx config if missing
if [ ! -f nginx.conf ]; then
  cat > nginx.conf <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://openclaw:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
  echo "Created default nginx.conf"
fi

# 5. Pull and start
echo "Pulling images and starting services..."
docker compose pull
docker compose up -d

echo ""
echo "=== Setup complete ==="
echo "Services running:"
docker compose ps
echo ""
echo "Logs: docker compose logs -f"
echo "Stop:  docker compose down"
