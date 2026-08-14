# ===================================================
# Choco D'or Backend - Production Dockerfile
# ===================================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Ensure data directory exists for database persistence
RUN mkdir -p /app/data

# Expose backend API port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the Express server with warnings suppressed
CMD ["node", "--no-warnings", "index.js"]
