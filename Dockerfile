# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration scripts
COPY scripts ./scripts

# Expose port (optional, for health checks)
EXPOSE 3000

# Run migrations (including user migration) and start the bot
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/import-users-after-migration.js && node dist/main"]
