# Base image
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# Development stage
FROM base AS development

RUN npm install

COPY . .

CMD [ "npm", "run", "app:dev" ]

# Production stage
FROM base AS production

RUN npm ci --only=production

COPY . .

RUN npm run build

RUN npm prune --production

EXPOSE 3000

CMD [ "npm", "start" ]
