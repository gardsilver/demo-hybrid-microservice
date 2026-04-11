FROM node:24-alpine
LABEL app_name="demo-hybrid-microservice"

WORKDIR /app

COPY package.json package-lock.json .env .default.env nest-cli.json tsconfig.build.json tsconfig.json ./
COPY src src
COPY front front
COPY migrations migrations
COPY protos protos
COPY tests tests
