FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy built app
COPY dist ./dist
COPY config ./config
COPY agent-rules ./agent-rules

# Create logs directory
RUN mkdir -p logs/runs

# Set environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1

# Start orchestrator
CMD ["node", "dist/main.js"]
