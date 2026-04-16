FROM node:24-alpine
LABEL app_name="demo-hybrid-microservice"

WORKDIR /app

# protoc требуется для npm run proto-compile (ts-proto plugin подтягивается из node_modules)
RUN apk add --no-cache protoc

COPY package.json package-lock.json .default.env .example.env nest-cli.json tsconfig.build.json tsconfig.json compile-protos.js ./
# .env опционален: если есть в build-контексте — попадёт, если нет — создадим ниже из .example.env
COPY .env* ./
COPY src src
COPY front front
COPY migrations migrations
COPY protos protos

# Формирование .env: если его нет — копируем из .example.env (аналог `make i`)
RUN if [ ! -f .env ]; then cp .example.env .env; fi

# 1) Установка зависимостей
RUN npm i

# 2) Компиляция proto-файлов (аналог `make proto-compile`)
RUN npm run proto-compile
