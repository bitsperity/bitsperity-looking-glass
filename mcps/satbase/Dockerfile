FROM node:22-alpine

WORKDIR /app

# Copy built files
COPY dist ./dist
COPY package.json package-lock.json ./
COPY node_modules ./node_modules

# Environment defaults
ENV HTTP_PORT=3001
ENV SATBASE_API_URL=http://localhost:8080
ENV LOG_LEVEL=info
ENV SERVER_NAME=satbase-mcp

EXPOSE 3001

CMD ["node", "dist/index-http.js"]
