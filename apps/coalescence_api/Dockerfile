FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (only what we need for sqlite)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install only FastAPI dependencies (minimal set)
RUN pip install --no-cache-dir \
    fastapi==0.120.4 \
    uvicorn[standard]==0.38.0 \
    pydantic==2.12.3 \
    python-dotenv==1.2.1

# Copy only coalescence_api and necessary files
COPY apps/coalescence_api /app/apps/coalescence_api
COPY coalescence/src/db/schema.sql /app/coalescence/src/db/schema.sql

WORKDIR /app

CMD ["uvicorn", "apps.coalescence_api.main:app", "--host", "0.0.0.0", "--port", "8084"]

