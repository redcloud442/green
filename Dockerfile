# Base stage with Node.js
FROM node:20-alpine AS base

# Add compatibility libraries for Alpine
RUN apk add --no-cache gcompat

# Build stage to install dependencies and build the app
FROM base AS builder
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./
RUN npm install --include=dev

# Copy the rest of the application files
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Generate the Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Final stage to set up the runtime environment
FROM base AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 redcloud

# Copy production dependencies, build output, and other required files
COPY --from=builder --chown=redcloud:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=redcloud:nodejs /app/dist ./dist
COPY --from=builder --chown=redcloud:nodejs /app/package.json ./package.json
COPY --from=builder --chown=redcloud:nodejs /app/prisma ./prisma

# Copy the entrypoint script to the container
COPY --from=builder --chown=redcloud:nodejs /app/scripts/entrypoint_overwrited.sh /app/entrypoint.sh

# Debugging: Verify file existence and content
RUN ls -l /app && cat /app/entrypoint.sh

# Ensure the entrypoint script has executable permissions
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER redcloud

# Set the environment variable for the application port
ENV PORT=3000
EXPOSE 3000



# Define the entrypoint for the container
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command to start the app
CMD ["node", "prod"]
