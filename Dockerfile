# ── Stage 1: Build Frontend ──────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

# Copy package files first for layer caching
COPY web-platform/frontend/package.json web-platform/frontend/package-lock.json ./

RUN npm ci

# Copy source and build
COPY web-platform/frontend/ .

# Empty VITE_API_URL = same-origin requests (frontend served from same host)
ENV VITE_API_URL=""

RUN npm run build


# ── Stage 2: Python Backend + Static Files ───────────────────
FROM python:3.12-slim

WORKDIR /app

COPY web-platform/backend-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY web-platform/backend-python/main.py .
COPY web-platform/backend-python/app ./app

# Copy built frontend from stage 1
COPY --from=frontend-build /frontend/dist ./static

# Run the application - use shell form to expand $PORT variable
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-3001}
