FROM node:22-alpine

WORKDIR /app

COPY dist ./dist
COPY package.json package-lock.json ./
COPY node_modules ./node_modules

ENV HTTP_PORT=3003
ENV ARIADNE_API_URL=http://localhost:8082
ENV LOG_LEVEL=info
ENV SERVER_NAME=ariadne-mcp

EXPOSE 3003

CMD ["node", "dist/index-http.js"]
