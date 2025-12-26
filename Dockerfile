# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
# Copy node_modules from builder and prune dev dependencies
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration scripts
COPY scripts ./scripts

# Expose port (optional, for health checks)
EXPOSE 3000

# Run migrations (including user migration) and start the bot
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/import-users-after-migration.js && node dist/main"]
