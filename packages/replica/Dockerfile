FROM node:20-alpine
WORKDIR /app/packages/replica

# copy package manifests
COPY packages/replica/package.json ./
COPY packages/common/package.json ../common/package.json

# install prod deps for replica
RUN npm install --omit=dev

# copy compiled output
COPY packages/common/dist ../common/dist
COPY packages/replica/dist ./dist

ENV PORT=8090
EXPOSE 8090
CMD ["node", "dist/server.js"]

