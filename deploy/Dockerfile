FROM node:24-alpine
LABEL app_name="demo-hybrid-microservice"

WORKDIR /app

# protoc требуется для npm run proto-compile (ts-proto plugin подтягивается из node_modules)
RUN apk add --no-cache protoc

# 1) Манифесты зависимостей и установка пакетов.
#    Слой инвалидируется только при изменении package.json / package-lock.json —
#    изменения в src/, protos/, конфигах НЕ приводят к повторному npm i.
COPY package.json package-lock.json ./
RUN npm i

# 2) Конфиги и исходный код — меняются чаще, но не требуют пересборки node_modules.
COPY .default.env .example.env nest-cli.json tsconfig.build.json tsconfig.json compile-protos.js ./
# .env опционален: если есть в build-контексте — попадёт, если нет — создадим ниже из .example.env
COPY .env* ./
COPY src src
COPY front front
COPY migrations migrations
COPY protos protos

# Формирование .env: если его нет — копируем из .example.env (аналог `make i`)
RUN if [ ! -f .env ]; then cp .example.env .env; fi

# 3) Компиляция proto-файлов (аналог `make proto-compile`).
#    Запускается только при изменениях в protos/ или в любом из файлов выше.
RUN npm run proto-compile
