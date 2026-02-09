FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN mkdir -p dist/generated && cp -R src/generated/prisma dist/generated/prisma

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY prisma ./prisma
EXPOSE 3400
CMD ["node", "dist/api/server.js"]
