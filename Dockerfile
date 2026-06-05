FROM node:22-slim

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything
COPY . .

# Install root dependencies
RUN npm install --legacy-peer-deps

# Build shared package
RUN cd packages/shared && npm install && npm run build

# Build API
RUN cd apps/api && npm install && npm run build

# Build Web
RUN cd apps/web && npm install && npm run build

EXPOSE 3000 8765

# Start both services
CMD ["sh", "-c", "cd apps/api && node dist/index.js & cd apps/web && npm start"]
