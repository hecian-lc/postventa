#!/bin/bash
# PostVenta — Script de actualización (pull + rebuild + restart)
# Ejecutar en el servidor: bash /opt/postventa/deploy/update.sh

set -e
cd /opt/postventa

echo "==> Pull de cambios..."
git pull origin main

echo "==> Actualizando dependencias del backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt -q

echo "==> Rebuilding frontend..."
cd ../frontend
npm install --silent
npm run build

echo "==> Reiniciando backend..."
systemctl restart postventa-backend

echo "✅ Actualización completa."
