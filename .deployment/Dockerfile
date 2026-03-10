# Multi-stage Dockerfile for Google Cloud Run deployment
# Application: Google Calendar Lab Automation
# Platform: Node.js 18+ with Express.js

# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from base stage
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs public ./public
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs start-live.js ./start-live.js
COPY --chown=nodejs:nodejs start-demo.js ./start-demo.js

# Switch to non-root user
USER nodejs

# Cloud Run expects the application to listen on $PORT
# Default to 8080 if not provided
ENV PORT=8080
ENV NODE_ENV=production

# Expose port 8080 (Cloud Run standard)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
# Cloud Run will inject $PORT environment variable
CMD ["node", "start-live.js"]
