FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y git build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# GPU optional: if torch with CUDA is prebuilt, allow runtime switch via host

COPY apps /app/apps
COPY libs /app/libs

ENV MANIFOLD_EMBED_MODEL=mixedbread-ai/mxbai-embed-large-v1 \
    MANIFOLD_QDRANT_COLLECTION=manifold_thoughts \
    QDRANT_URL=http://localhost:6333

CMD ["uvicorn", "apps.manifold_api.main:app", "--host", "0.0.0.0", "--port", "8083"]


