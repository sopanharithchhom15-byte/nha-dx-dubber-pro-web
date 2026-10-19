# Production Dockerfile for Nha DX Dubber Pro Web App
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev=false

# Copy application files
COPY . .

# Build Vite frontend
RUN npm run build

# Clean up devDependencies to save space
RUN npm prune --production

# Expose application port
ENV PORT=10000
EXPOSE 10000

# Start production Node.js server
CMD ["node", "server.js"]
