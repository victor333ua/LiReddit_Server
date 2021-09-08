# syntax=docker/dockerfile:1
FROM node:16

WORKDIR /app

COPY ["package.json", "yarn.lock", "./"]

RUN yarn 

COPY . .
COPY .env.production .env

RUN yarn build

ENV NODE_ENV=production

CMD [ "node", "dist/index.js" ]