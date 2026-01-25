FROM python:3.12-slim

WORKDIR /app

# Copy backend-python files
COPY web-platform/backend-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (excluding unnecessary files)
COPY web-platform/backend-python/main.py .
COPY web-platform/backend-python/app ./app

# Run the application - use shell form to expand $PORT variable
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-3001}
