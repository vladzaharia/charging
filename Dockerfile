# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY . .
RUN corepack enable && \
    yarn install --immutable
RUN yarn build

# Production stage
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 astro && \
    chown -R astro:nodejs /app

# Copy build output and content
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/src/content ./src/content

# Copy package files and Yarn configuration
COPY --from=builder --chown=astro:nodejs /app/package.json ./
COPY --from=builder --chown=astro:nodejs /app/yarn.lock ./
COPY --from=builder --chown=astro:nodejs /app/.yarn ./.yarn
COPY --from=builder --chown=astro:nodejs /app/.yarnrc.yml ./

RUN apk update && apk add curl

RUN corepack enable && \
    yarn install --immutable && \
    yarn cache clean

USER astro
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]