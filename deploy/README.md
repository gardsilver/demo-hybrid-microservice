# Deploy

Минимальные настройки окружения для локальной среды разработки: **Postgres**, **Redis** (**Redis Insight**), **Kafka** (**Kafka UI**), **RabbitMq** (**RabbitMq Management**).

## ВНИМАНИЕ

Не использовать в **production**! Предназначено только для локальной разработки.

## Установка и настройка

Все часто используемые команды указаны в `makefile`.

| **make**-команда | Описание |
|---|---|
|`make init`| Создает необходимые volumes |
|`make dc-rm-all`| Удаляет все Docker контейнеры |
|`make dc-down`| Останавливает работу всех контейнеров |
|`make dc-start`| Запускает все контейнеры окружения и микросервис **Demo Hybrid Microservice**  |
|`make dc-down-postgres`| Останавливает работу **Postgres**  |
|`make dc-down-redis`| Останавливает работу **Redis**  |
|`make dc-down-kafka`| Останавливает работу **Kafka**  |
|`make dc-down-rabbitmq`| Останавливает работу **RabbitMq**  |
|`make dc-down-dhms`| Останавливает работу микросервис **Demo Hybrid Microservice**  |
|`make dc-logs-dhms`| Выводит логи микросервиса **Demo Hybrid Microservice**  |

После успешного запуска будут доступны следующие контейнеры:

- **postgresdb**: Database **Postgres**
- **redis**: Database **Redis**
- **redis-ui**: Web-клиент **Redis Insight**
- **kafka**: Брокер **kafka**
- **kafka-ui**: Web-клиент **kafka UI**
- **rabbitmq**: Брокер **RabbitMq**
- **demo-hybrid-microservice**: Микросервис **Demo Hybrid Microservice**

## **Postgres**

| Параметр | Описание | **.env** **Demo Hybrid Microservice** | localhost |
|---|---|---|---|
| `HOST` | Host **Postgres**  | `DATABASE_HOST=postgresdb`  | `host=localhost` |
| `PORT` | Port **Postgres**  | `DATABASE_PORT=5432` | `port=5432` |
| `DATABASE` | База данных  | `DATABASE_NAME=demo` | `database=demo` |
| `USER` | Имя пользователя  | `DATABASE_USER=vagrant` | `user=vagrant` |
| `PASSWORD` | Пароль пользователя  | `DATABASE_PASSWORD=vagrant` | `password=vagrant` |

## **Redis**

| Параметр | Описание | **.env** **Demo Hybrid Microservice** | localhost |
|---|---|---|---|
| `HOST` | Host для подключения к **Redis**  | `REDIS_CACHE_MANAGER_HOST=redis` | `host=localhost` |
| `PORT` | Port для подключения к **Redis**  | `REDIS_CACHE_MANAGER_PORT=6379` |  `port=6379` |

- <http://localhost:5540> - **Redis Insight**

## **Kafka**

| Параметр | Описание | **.env** **Demo Hybrid Microservice** | localhost |
|---|---|---|---|
| `KAFKA_BROKERS` | Список брокеров (через ",") для подключения к **Kafka**  | `KAFKA_BROKERS=kafka:9092` | `host=localhost` |

- <http://localhost:8082> - **Kafka UI**

## **RabbitMq**

| Параметр | Описание | **.env** **Demo Hybrid Microservice** | localhost |
|---|---|---|---|
| `RABBIT_MQ_URLS` | Список брокеров (через ",") для подключения к **RabbitMq**  | `RABBIT_MQ_URLS=rabbitmq:5672` | `host=localhost` |
| `RABBIT_MQ_USER` | Имя пользователя  | `RABBIT_MQ_USER=admin` | `user=admin` |
| `RABBIT_MQ_PASSWORD` | Пароль пользователя  | `RABBIT_MQ_PASSWORD=admin` | `password=admin` |

- <http://localhost:15672> - **RabbitMq Management** (user: `admin`; pass: `admin`)
