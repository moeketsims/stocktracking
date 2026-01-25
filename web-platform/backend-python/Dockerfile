FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Heroku uses dynamic PORT)
EXPOSE 3001

# Run the application - use shell form to expand $PORT variable
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-3001}
