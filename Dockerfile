# Multistage Production Dockerfile for EthioCraft API Server
# Build Stage 1: Install dependencies and compile Prisma client
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Build Stage 2: Runner container 
FROM node:18-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# Prune development scripts
RUN rm -rf client/node_modules scripts/seed-database.js database

EXPOSE 5000

CMD ["npm", "run", "start"]
