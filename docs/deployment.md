# PharmacyOS — Production Deployment & Administration Guide

## 1. System Requirements & Architecture
- **Operating System**: Linux (Ubuntu 22.04 LTS recommended) or Windows Server 2022.
- **Node.js**: v18.x LTS or v20.x LTS.
- **Database**: PostgreSQL 14+ with TLS SSL connection enabled.
- **Reverse Proxy**: Nginx with HTTPS (Let's Encrypt / Certbot).
- **Process Manager**: PM2 or Docker / Kubernetes containerization.

---

## 2. Environment Configuration (`.env.production`)

```env
# Node Environment
NODE_ENV=production
PORT=5000

# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://pharmacyos_user:SECURE_PASSWORD@127.0.0.1:5432/pharmacyos_db?schema=public&sslmode=prefer"

# JWT Authentication Secrets
JWT_SECRET="SUPER_SECRET_RANDOM_64_CHAR_HEX_KEY_DO_NOT_SHARE"
JWT_EXPIRES_IN="24h"

# CORS Origin Allowed Client Domains
CORS_ORIGIN="https://pharmacyos.example.com"

# Logging Level
LOG_LEVEL="info"
```

---

## 3. Database Migration & Initialization Pipeline

Run the following commands during deployment build step:

```bash
# Install dependencies
npm ci

# Generate Prisma Client types
npx prisma generate

# Apply pending production database schema migrations
npx prisma migrate deploy

# Seed initial system permissions & system roles (if fresh DB)
npm run seed
```

---

## 4. Production Process Management (PM2 Configuration)

Create `ecosystem.config.js` in root directory:

```javascript
module.exports = {
  apps: [
    {
      name: 'pharmacyos-backend',
      script: './backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

Start the application:
```bash
# Build backend TypeScript code
cd backend && npm run build && cd ..

# Start PM2 cluster
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 5. Nginx Reverse Proxy & SSL Setup

```nginx
server {
    listen 80;
    server_name pharmacyos.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pharmacyos.example.com;

    ssl_certificate /etc/letsencrypt/live/pharmacyos.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pharmacyos.example.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    # Frontend Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API Express server
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. PostgreSQL Automated Daily Backups

Add cron job (`crontab -e`):
```bash
0 2 * * * pg_dump -U pharmacyos_user pharmacyos_db | gzip > /var/backups/pharmacyos/db_backup_$(date +\%Y\%m\%d).sql.gz
```
