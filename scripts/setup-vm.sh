#!/bin/bash
set -e

# ============================================================
# Wechatbot VM Setup Script — Oracle Cloud Ubuntu 24.04
# Run this on the VM after SSH in
# ============================================================

# === Configuration ===
MYSQL_PRIVATE_IP="10.0.0.147"
MYSQL_PORT="3306"
SOCAT_PORT="3307"
PDF_PORT="8000"

echo ">>> Updating system packages..."
sudo apt update -qq
sudo apt upgrade -y -qq

echo ">>> Installing LibreOffice + Java (for PDF conversion)..."
sudo apt install -y -qq libreoffice-writer default-jre-headless fonts-noto-cjk \
  fonts-wqy-microhei fonts-liberation fonts-dejavu-core ca-certificates curl

echo ">>> Installing Python dependencies..."
sudo apt install -y -qq python3-pip python3-venv
sudo pip3 install fastapi uvicorn python-multipart pdf2docx PyMuPDF pymupdf-fonts Pillow lxml --quiet

echo ">>> Installing socat (MySQL TCP forwarder)..."
sudo apt install -y -qq socat

echo ">>> Creating /opt/wechatbot directory..."
sudo mkdir -p /opt/wechatbot/pdf-service /opt/wechatbot/logs
sudo chown -R ubuntu:ubuntu /opt/wechatbot

# === Deploy PDF Service ===
echo ">>> Deploying PDF Service..."
# Note: main.py and converter_worker.py should be copied from the repo
# If running from the cloned repo directory:
# cp pdf-service/main.py /opt/wechatbot/pdf-service/
# cp pdf-service/converter_worker.py /opt/wechatbot/pdf-service/
cat > /opt/wechatbot/pdf-service/requirements.txt << 'EOF'
fastapi
uvicorn
python-multipart
pdf2docx
PyMuPDF
pymupdf-fonts
Pillow
lxml
EOF

# === Create systemd service: PDF Service ===
echo ">>> Creating systemd service for PDF Service..."
sudo tee /etc/systemd/system/wechatbot-pdf.service > /dev/null << 'SERVICE'
[Unit]
Description=Wechatbot PDF Conversion Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/wechatbot/pdf-service
Environment=PDF_SERVICE_API_KEY=
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info
Restart=always
RestartSec=5
StandardOutput=append:/opt/wechatbot/logs/pdf-service.log
StandardError=append:/opt/wechatbot/logs/pdf-service.err

[Install]
WantedBy=multi-user.target
SERVICE

# === Create systemd service: socat MySQL Proxy ===
echo ">>> Creating systemd service for MySQL TCP forwarder..."
sudo tee /etc/systemd/system/wechatbot-mysql-proxy.service > /dev/null << 'SERVICE'
[Unit]
Description=MySQL TCP Forwarder (socat) — VM:3307 → MySQL HeatWave:3306
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/socat TCP-LISTEN:3307,fork,reuseaddr TCP:10.0.0.147:3306
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE

echo ">>> Reloading systemd daemon..."
sudo systemctl daemon-reload

echo ""
echo "============================================"
echo " VM Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Copy pdf-service files:"
echo "     scp pdf-service/main.py ubuntu@<VM_IP>:/opt/wechatbot/pdf-service/"
echo "     scp pdf-service/converter_worker.py ubuntu@<VM_IP>:/opt/wechatbot/pdf-service/"
echo ""
echo "  2. Set the PDF API key:"
echo "     sudo sed -i 's/PDF_SERVICE_API_KEY=/PDF_SERVICE_API_KEY=your-secret-key/' /etc/systemd/system/wechatbot-pdf.service"
echo "     sudo systemctl daemon-reload"
echo ""
echo "  3. Start services:"
echo "     sudo systemctl start wechatbot-pdf"
echo "     sudo systemctl start wechatbot-mysql-proxy"
echo "     sudo systemctl enable wechatbot-pdf wechatbot-mysql-proxy"
echo ""
echo "  4. Check status:"
echo "     sudo systemctl status wechatbot-pdf"
echo "     sudo systemctl status wechatbot-mysql-proxy"
echo ""
echo "  5. Test PDF health:"
echo "     curl http://localhost:8000/health"
echo ""
echo "  6. Test MySQL proxy:"
echo "     mysql -h 127.0.0.1 -P 3307 -u admin -p -e 'SHOW DATABASES;'"
echo "============================================"
