FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY packages/common/package.json packages/common/package.json
COPY packages/core/package.json packages/core/package.json

RUN npm install --omit=dev

COPY packages/common/dist packages/common/dist
COPY packages/core/dist packages/core/dist

ENV PORT=8080
EXPOSE 8080
CMD ["node", "packages/core/dist/server.js"]

