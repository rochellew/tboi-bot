FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js deploy-commands.js ./
COPY commands ./commands
COPY events ./events

USER node
CMD ["node", "index.js"]