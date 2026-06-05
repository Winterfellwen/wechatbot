FROM node:22-slim

WORKDIR /app

# Copy web app files
COPY apps/web/package*.json ./apps/web/

# Install web dependencies
RUN cd apps/web && npm install

# Copy web source
COPY apps/web ./apps/web

# Build web app
RUN cd apps/web && npm run build

EXPOSE 3000

CMD ["sh", "-c", "cd apps/web && npm start"]
