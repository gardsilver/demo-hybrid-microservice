FROM node:22-alpine
LABEL app_name="demo-hybrid-microservice"

WORKDIR /app

COPY package.json package-lock.json .env .default.env nest-cli.json tsconfig.build.json tsconfig.json ./
COPY src src
COPY migrations migrations
COPY protos protos
COPY tests tests
