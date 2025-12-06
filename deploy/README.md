# Deploy

Минимальные настройки окружения для локальной среды разработки: **Postgres**, **Redis** (**Redis Insight**), **Kafka** (**Kafka UI**).

## ВНИМАНИЕ

Не использовать в **production**! Предназначено только для локальной разработки.

## Установка и настройка

Все часто используемые команды указаны в `makefile`.

| **make**-команда | Описание |
|---|---|
|`sudo make init`| Создает необходимые volumes |
|`sudo make dc-rm-all`| Удаляет все Docker контейнеры |
|`sudo make dc-down`| Останавливает работу всех контейнеров |
|`sudo make dc-start`| Запускает все контейнеры окружения и микросервис **Demo Hybrid Microservice**  |
|`sudo make dc-down-postgres`| Останавливает работу **Postgres**  |
|`sudo make dc-down-redis`| Останавливает работу **Redis**  |
|`sudo make dc-down-kafka`| Останавливает работу **Kafka**  |
|`sudo make dc-down-dhms`| Останавливает работу микросервис **Demo Hybrid Microservice**  |
|`sudo make dc-logs-dhms`| Выводит логи микросервиса **Demo Hybrid Microservice**  |

После успешного запуска будут доступны следующие контейнеры:

- **postgresdb**: Database **Postgres**
- **redis**: Database **Redis**
- **redis-ui**: Web-клиент **Redis Insight**
- **kafka**: Брокер **kafka**
- **kafka-ui**: Web-клиент **kafka UI**
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
