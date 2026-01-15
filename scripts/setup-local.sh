#!/bin/bash
# Local Development Setup Script
# This script starts Supabase and configures the backend with correct credentials

set -e

echo "=========================================="
echo "Potato Stock Tracking - Local Setup"
echo "=========================================="
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting."; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "npx is required but not installed. Aborting."; exit 1; }

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "[1/5] Starting Supabase..."
cd infra/supabase
npx supabase start

echo ""
echo "[2/5] Extracting Supabase credentials..."

# Get the credentials from supabase status
SUPABASE_URL=$(npx supabase status --output json | grep -o '"API URL": "[^"]*"' | cut -d'"' -f4)
ANON_KEY=$(npx supabase status --output json | grep -o '"anon key": "[^"]*"' | cut -d'"' -f4)
SERVICE_KEY=$(npx supabase status --output json | grep -o '"service_role key": "[^"]*"' | cut -d'"' -f4)

# Fallback to default local values if parsing failed
if [ -z "$SUPABASE_URL" ]; then
    SUPABASE_URL="http://127.0.0.1:54321"
fi

cd "$PROJECT_ROOT"

echo ""
echo "[3/5] Updating backend environment..."

cat > web-platform/backend-python/.env << EOF
PORT=3001
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_KEY=${SERVICE_KEY}
EOF

echo "Backend .env updated with Supabase credentials"

echo ""
echo "[4/5] Updating frontend environment..."

cat > web-platform/frontend/.env << EOF
VITE_API_URL=http://localhost:3001
EOF

echo "Frontend .env configured"

echo ""
echo "[5/5] Running database migrations and seed..."
cd infra/supabase
npx supabase db reset

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Supabase Studio: http://localhost:54323"
echo "API URL: ${SUPABASE_URL}"
echo ""
echo "To start the web platform:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd web-platform/backend-python"
echo "    pip install -r requirements.txt  # First time only"
echo "    python main.py"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd web-platform/frontend"
echo "    npm install  # First time only"
echo "    npm run dev"
echo ""
echo "Or run both together:"
echo "    npm run web:start"
echo ""
echo "Login: admin@test.com / Test123!"
echo ""
