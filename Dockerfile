# ── Build stage ───────────────────────────────────────────────────────────────
FROM public.ecr.aws/z6b7g3i0/actions/node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM public.ecr.aws/z6b7g3i0/actions/node:20-alpine

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

CMD ["node", "server.js"]
