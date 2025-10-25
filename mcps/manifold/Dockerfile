FROM node:22-alpine

WORKDIR /app

COPY dist ./dist
COPY package.json package-lock.json ./
COPY node_modules ./node_modules

ENV HTTP_PORT=3002
ENV MANIFOLD_API_URL=http://localhost:8083
ENV LOG_LEVEL=info
ENV SERVER_NAME=manifold-mcp

EXPOSE 3002

CMD ["node", "dist/index-http.js"]
