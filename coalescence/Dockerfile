FROM node:22-slim

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy source and config
COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY config ./config
COPY agent-rules ./agent-rules

# Create logs directories
RUN mkdir -p logs/runs logs/chats

# Set environment (can be overridden by docker-compose)
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3100/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" || exit 1

# Start orchestrator with tsx
CMD ["npx", "tsx", "src/main.ts"]
