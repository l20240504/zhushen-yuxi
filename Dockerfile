FROM node:20-slim

WORKDIR /app/server

COPY server/package.json ./
RUN npm install --production

COPY server/ ./

# Build client
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

WORKDIR /app/server
ENV NODE_ENV=production
ENV DATABASE_SSL=true

EXPOSE 10000

CMD ["node", "index.js"]
