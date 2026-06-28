# VPS Deploy Guide

Use this when you are ready to keep Autody Liquidity Manager online 24/7.

## 1. Server

Recommended minimum:

- Ubuntu 22.04 or 24.04
- 1 vCPU
- 1 GB RAM
- 15 GB disk

## 2. Install Node

```bash
sudo apt update
sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 3. Upload Project

Upload the `autody-liquidity-manager` folder to the VPS.

Example path:

```txt
/opt/autody-liquidity-manager
```

## 4. Configure Environment

```bash
cd /opt/autody-liquidity-manager
cp .env.example .env
nano .env
```

Set:

```txt
POLYGON_RPC_URL=
OWNER_WALLET_ADDRESS=
```

Use a stronger private RPC later if the free public RPC rate-limits.

## 5. Run

```bash
npm start
```

Open:

```txt
http://your-vps-ip:4177
```

## 6. Keep Online With PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name autody-portal
pm2 start worker/monitor.js --name autody-monitor
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`.

## 7. Optional Nginx

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/autody
```

Config:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4177;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/autody /etc/nginx/sites-enabled/autody
sudo nginx -t
sudo systemctl reload nginx
```

## Security Rule

Do not put private keys into this app. Keep transaction signing manual until the owner portal has proper authentication, hardware wallet support, and transaction review screens.
