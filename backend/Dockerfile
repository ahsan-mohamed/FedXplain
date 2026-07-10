# FedXplain Backend — Production Dockerfile
FROM python:3.12-slim

WORKDIR /app

# System deps needed for bcrypt/psycopg2-style builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Directories the app writes to at runtime
RUN mkdir -p logs models_store/versions data/raw data/partitioned

EXPOSE 8000

# Healthcheck hits our own /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
