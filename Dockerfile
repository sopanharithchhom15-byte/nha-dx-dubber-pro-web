# Production Dockerfile for Nha DX Dubber Pro Web App
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files (pre-built app.js, app.css, index.html, server.js)
COPY . .

# Expose application port
ENV PORT=10000
EXPOSE 10000

# Start production Node.js server
CMD ["node", "server.js"]
