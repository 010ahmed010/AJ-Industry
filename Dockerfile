# Stage 1: Build client and server bundles
FROM node:22-alpine AS builder

RUN npm install -g npm@latest

WORKDIR /app

# Copy root and workspace package manifests for optimal layer caching
COPY package*.json ./
COPY artifacts/aj-industry/package*.json ./artifacts/aj-industry/
COPY artifacts/api-server/package*.json ./artifacts/api-server/
COPY lib/api-client-react/package*.json ./lib/api-client-react/
COPY lib/api-zod/package*.json ./lib/api-zod/

# Install all workspace dependencies for compilation
RUN npm install

# Copy complete project source code
COPY . .

# Optional build-time argument for Vite frontend configuration
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL

# Build client SPA and bundled production backend
RUN npm run build

# Stage 2: Minimal production runtime
FROM node:22-alpine AS production

RUN npm install -g npm@latest

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled backend bundle and frontend distribution assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/artifacts/aj-industry/dist ./artifacts/aj-industry/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
