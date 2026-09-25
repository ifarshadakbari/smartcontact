#!/bin/bash
cd /www/wwwroot/ip.parszarasa.local/webapp/smartcontact
git reset --hard HEAD
git pull origin main
npm run build
chown -R www:www dist
echo "SmartContact deployed successfully!"
