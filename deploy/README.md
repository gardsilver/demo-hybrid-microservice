# Deploy

Минимальные настройки локальной среды разработки: **Postgres**, **Redis** (**Redis Insight**), **Kafka** (**Kafka UI**), **RabbitMq** (**RabbitMq Management**) и сам микросервис **Demo Hybrid Microservice**.

## ВНИМАНИЕ

Не использовать в **production**! Предназначено только для локальной разработки.

## Состав

- `base-compose.yml` — описание контейнеров инфраструктуры (Postgres, Redis, Redis Insight, Kafka, Kafka UI, RabbitMq).
- `demo-hybrid-microservice.yml` — overlay для запуска самого микросервиса в Docker (сборка из корня репозитория, entrypoint `npm run start:dev`, монтирование исходников `../:/app`, порты `3000:3000` и `3001:3001`).
- `makefile` — набор команд для управления инфраструктурой (см. ниже).

Все команды `docker compose` применяют оба файла одновременно (`-f base-compose.yml -f demo-hybrid-microservice.yml`). Сеть `dev-local` (bridge) и внешние volumes (`postgres`, `redis`, `kafka`, `rabbitmq`) создаются заранее командой `make init`.

## Установка и настройка

Все часто используемые команды указаны в `makefile`. Запускаются **из каталога `deploy/`**.

| **make**-команда | Описание |
|---|---|
| `make dc-start` | Запускает все контейнеры окружения и микросервис **Demo Hybrid Microservice** (`docker compose ... up -d`). |
| `make dc-down` | Останавливает работу всех контейнеров (`docker compose ... down`). |
| `make dc-rm-all` | Останавливает контейнеры и полностью очищает Docker (`system prune` с volumes и images). |
| `make dc-down-postgres` | Останавливает **Postgres**. |
| `make dc-down-redis` | Останавливает **Redis**. |
| `make dc-down-kafka` | Останавливает **Kafka**. |
| `make dc-down-rabbitmq` | Останавливает **RabbitMq**. |
| `make dc-down-dhms` | Останавливает микросервис **Demo Hybrid Microservice**. |
| `make dc-logs-dhms` | Показывает последние 50 строк логов микросервиса **Demo Hybrid Microservice** с отслеживанием. |

После успешного запуска будут доступны следующие контейнеры:

- **postgresdb** — **Postgres** (`postgres:latest`).
- **redis** — **Redis** (`redis:latest`).
- **redis-ui** — Web-клиент **Redis Insight** (`redis/redisinsight:latest`).
- **kafka** — Брокер **Kafka** (`apache/kafka:latest`, KRaft-режим, single-node).
- **kafka-ui** — Web-клиент **Kafka UI** (`provectuslabs/kafka-ui:latest`).
- **rabbitmq** — Брокер **RabbitMq** (`rabbitmq:4-management`).
- **demo-hybrid-microservice** — сам микросервис (собирается из `../Dockerfile` или контекста `../`, запускается `npm run start:dev`).

## Сетевое взаимодействие

Все контейнеры подключены к bridge-сети `dev-local`. Микросервис обращается к инфраструктурным сервисам **по именам контейнеров** (`postgresdb`, `redis`, `kafka`, `rabbitmq`); с хоста (`localhost`) — через проброшенные порты (ниже).

## **Postgres**

Образ `postgres:latest`. Переменные окружения заданы в `base-compose.yml`: `POSTGRES_USER=vagrant`, `POSTGRES_PASSWORD=vagrant`, `POSTGRES_DB=demo`, `TZ=Europe/Moskow`.

| Параметр | Описание | `.env` микросервиса | localhost |
|---|---|---|---|
| `HOST` | Host **Postgres** | `DATABASE_HOST=postgresdb` | `host=localhost` |
| `PORT` | Port **Postgres** | `DATABASE_PORT=5432` | `port=5432` |
| `DATABASE` | База данных | `DATABASE_NAME=demo` | `database=demo` |
| `USER` | Имя пользователя | `DATABASE_USER=vagrant` | `user=vagrant` |
| `PASSWORD` | Пароль пользователя | `DATABASE_PASSWORD=vagrant` | `password=vagrant` |

## **Redis**

Образ `redis:latest`, запускается с флагом `--appendonly yes` (персистентность через AOF).

| Параметр | Описание | `.env` микросервиса | localhost |
|---|---|---|---|
| `HOST` | Host для подключения к **Redis** | `REDIS_CACHE_MANAGER_HOST=redis` | `host=localhost` |
| `PORT` | Port для подключения к **Redis** | `REDIS_CACHE_MANAGER_PORT=6379` | `port=6379` |

- <http://localhost:5540> — **Redis Insight** (автоматически подключён к `redis:6379` через переменные `RI_REDIS_HOST` / `RI_REDIS_PORT`).

## **Kafka**

Образ `apache/kafka:latest`. Запускается в **KRaft**-режиме (без Zookeeper) как single-node (controller + broker). `CLUSTER_ID=demo-hybrid-kafka-cluster`. Advertised listener — `PLAINTEXT://kafka:9092`.

| Параметр | Описание | `.env` микросервиса | localhost |
|---|---|---|---|
| `KAFKA_BROKERS` | Список брокеров (через `,`) для подключения к **Kafka** | `KAFKA_BROKERS=kafka:9092` | `localhost:9092` |

- <http://localhost:8082> — **Kafka UI** (внутри контейнера слушает `:8080`, проброшен на хост `:8082`; кластер — `kraft`, `DYNAMIC_CONFIG_ENABLED=true`).

## **RabbitMq**

Образ `rabbitmq:4-management` (с Management-плагином). Переменные окружения заданы в `base-compose.yml`: `RABBITMQ_DEFAULT_USER=admin`, `RABBITMQ_DEFAULT_PASS=admin`.

| Параметр | Описание | `.env` микросервиса | localhost |
|---|---|---|---|
| `RABBIT_MQ_URLS` | Список брокеров (через `,`) для подключения к **RabbitMq** | `RABBIT_MQ_URLS=rabbitmq:5672` | `localhost:5672` |
| `RABBIT_MQ_USER` | Имя пользователя | `RABBIT_MQ_USER=admin` | `user=admin` |
| `RABBIT_MQ_PASSWORD` | Пароль пользователя | `RABBIT_MQ_PASSWORD=admin` | `password=admin` |

- <http://localhost:15672> — **RabbitMq Management** (user: `admin`; pass: `admin`).

## Микросервис в контейнере

`demo-hybrid-microservice.yml` собирает образ из корня репозитория (`context: ../`), монтирует исходники как том (`../:/app`) и запускает `npm --prefix=/app run start:dev`. Проброшенные порты: `3000:3000` (HTTP/Swagger/WebSocket) и `3001:3001` (gRPC). При изменении исходников — `nest start --watch` автоматически перезапустит приложение внутри контейнера.
