#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/www/wwwroot/ip.parszarasa.local/webapp/smartcontact"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BRANCH="main"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}     🚀 SmartContact Deployment Script Starting    ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Git Pull
echo -e "\n${YELLOW}[1/5] Fetching latest changes from GitHub...${NC}"
cd "$PROJECT_ROOT"
git config --global --add safe.directory "$PROJECT_ROOT" 2>/dev/null || true
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# Fix monorepo if needed
if [ ! -f "$FRONTEND_DIR/package.json" ] && [ -f "$PROJECT_ROOT/package.json" ]; then
    mkdir -p "$FRONTEND_DIR"
    mv index.html metadata.json package.json package-lock.json server.ts tsconfig.json vite.config.ts src "$FRONTEND_DIR/" 2>/dev/null || true
fi

echo -e "${GREEN}✔ Repository updated.${NC}"

# 2. Backend
echo -e "\n${YELLOW}[2/5] Updating Backend (Laravel)...${NC}"
cd "$BACKEND_DIR"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        php artisan key:generate --ansi
    fi
fi

composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo -e "${GREEN}✔ Backend ready.${NC}"

# 3. Frontend
echo -e "\n${YELLOW}[3/5] Updating & Building Frontend (React/Vite)...${NC}"
cd "$FRONTEND_DIR"
npm install --no-audit --no-fund
npm run build
echo -e "${GREEN}✔ Frontend build completed.${NC}"

# 4. Permissions
echo -e "\n${YELLOW}[4/5] Setting Permissions...${NC}"
chown -R www:www "$PROJECT_ROOT"
chmod -R 755 "$PROJECT_ROOT"
chmod -R 775 "$BACKEND_DIR/storage" "$BACKEND_DIR/bootstrap/cache"
echo -e "${GREEN}✔ Permissions updated.${NC}"

# 5. Reload Services
echo -e "\n${YELLOW}[5/5] Reloading Web Server...${NC}"
if command -v systemctl &> /dev/null; then
    systemctl reload php-fpm-84 2>/dev/null || systemctl reload php-fpm 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || nginx -s reload
else
    nginx -s reload
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  🎉 Deployment Completed Successfully! 🚀         ${NC}"
echo -e "${GREEN}====================================================${NC}"
