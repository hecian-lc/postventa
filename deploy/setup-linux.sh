#!/bin/bash
# PostVenta — Setup inicial en servidor Linux (Ubuntu/Debian)
# Ejecutar como root o con sudo: bash setup-linux.sh

set -e

echo "==> Instalando dependencias del sistema..."
apt-get update -q
apt-get install -y python3 python3-venv python3-pip nodejs npm nginx git

echo "==> Creando directorio /opt/postventa..."
mkdir -p /opt/postventa
cd /opt/postventa

echo "==> Copiando archivos del proyecto..."
# Asumiendo que el repo ya fue clonado en el directorio actual
# git clone https://github.com/TU_USUARIO/postventa.git /opt/postventa

echo "==> Backend: creando entorno virtual..."
cd /opt/postventa/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo "==> Configurar .env (copiá .env.example y editá los valores)..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  ⚠️  Editá /opt/postventa/backend/.env antes de continuar"
fi

echo "==> Frontend: instalando dependencias y compilando..."
cd /opt/postventa/frontend
npm install --silent
npm run build

echo "==> Instalando servicio systemd..."
cp /opt/postventa/deploy/postventa-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable postventa-backend
systemctl start postventa-backend

echo "==> Configurando Nginx..."
cp /opt/postventa/deploy/nginx.conf /etc/nginx/sites-available/postventa
ln -sf /etc/nginx/sites-available/postventa /etc/nginx/sites-enabled/postventa
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "✅ Setup completo."
echo "   Backend:  systemctl status postventa-backend"
echo "   Nginx:    systemctl status nginx"
echo "   Logs:     journalctl -u postventa-backend -f"
