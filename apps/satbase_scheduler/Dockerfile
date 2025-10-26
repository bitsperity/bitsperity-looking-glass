FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/satbase_scheduler/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy scheduler code
COPY apps/satbase_scheduler/ .

# Copy libs directory so it can be imported
COPY libs ./libs

CMD ["python", "main.py"]

