# Demo Hybrid Microservice

Минимальное серверное приложение [NodeJs v22](http://nodejs.org).

Реализован и настроен базовый системный функционал:

- Настроено сквозное логирование в формате **ElasticSearch** с поддержкой пользовательского асинхронного контекста выполнения и возможностью добавления различных лог-форматеров.
- Прозрачность и наблюдаемость за состоянием сервера: метрики **Prometheus** и **Health Check Monitor**
- Корректное завершение приложение **Graceful Shutdown**.
- Реализована взаимодействие в базой данных **Postgres**: логирование, базовые метрики, авто-применение миграций.
- Настроено кеширование с использованием **Redis** (не блокирует выполнение приложения в случае не доступности **Redis** и реализовано автоматическое восстановление соединения).
- Настроена интеграция с сервером очередей **Kafka**: автоматическое восстановление соединения, логирование, метрики, запуск консъюмеров **eachMessage** или **eachBatch**...

## Установка и настройка

### Настройки окружения

Для работы приложения необходимо:

- Установить компилятор [protobuf](https://protobuf.dev/installation/)
- Создать БД **Postgres**
- Настроить параметры подключения `.env`.

Общая конфигурация параметров окружения:

- `.example.env` Содержит все доступные параметры окружения. Носит описательный характер и не влияет на работу приложения. Более подробную информацию по каждому параметру можно найти в `README.md` соответствующего модуля.
- `.default.env` Задает значения параметров окружения, которые будут использованы по умолчанию для всех окружений.
- `.env` Определяет значения параметров окружения, которые будут применены для текущего развертывания.

Например, если указать следующие параметры:

```env
SERVICE_PORT=3000
GRPC_HOST=127.0.0.1
GRPC_PORT=3001
```

То будут доступны:

- <http://127.0.0.1:3000> - **Swagger**
- <http://127.0.0.1:3001> - **gRPS**-сервис с настроенным **Reflection-Service**.

### Сборка микросервиса

Все часто используемые команды указаны в `makefile`.

| **make**-команда | Аналог **npm** | Описание |
|---|---|---|
|`make i`| `npm i` | Выполняет установку зависимостей |
|`make proto-compile`| `npm run proto-compile` | Выполняет компиляцию **proto**-файлов в `Lunix` (**@see** `compile-protos.js`) |
|`make proto-compile-win`| `npm run proto-compile-win` | Выполняет компиляцию **proto**-файлов в `Windows` (**@see** `compile-protos.js`) |
|`make start`| `npm run start` | Запуск микросервиса без отслеживания изменения файлов. |
|`make start-dev`| `npm run start:dev` | Запуск микросервиса c отслеживанием изменений файлов. |
|`make rebuild`| `rmdir /s /q .\dist` <br> `rmdir /s /q .\node_modules` <br> `npm i` <br> `npm run proto-compile` | Осуществляет полную пересборку микросервиса в `Lunix` |
|`make rebuild-win`| `rmdir /s /q .\dist` <br> `rmdir /s /q .\node_modules` <br> `npm i` <br> `npm run proto-compile-win` | Осуществляет полную пересборку микросервиса в `Windows` |
|`make lint`| `npm run format` <br> `git diff --name-only --diff-filter=AM origin/master > .eslint-list` <br> `npm run lint:diff` | Авто коррекция code-style для измененных файлов. (Применимо только для `Lunix`) |
|`make lint-all`| `npm run format` <br> `npm run lint:all` | Авто коррекция code-style файлов. |
|`make test`| `npm run test` | Запускает **unit**-тесты без расчета уровня покрытия тестами. |
|`make test-cov`| `npm run test:cov` | Запускает **unit**-тесты c расчетом уровня покрытия тестами. |
|`make test-e2e`| `npm run test:e2e` | Запускает **end-to-end**-тесты. |

## Локальная среда разработки

Добавлены параметры конфигурации **docker-compose** и настроены часто используемые команды позволяющие быстро поднимать минимально-необходимое окружение, эмулировать различные аварийные ситуации (например отказ **Postgres** или другой интеграции). **see** `deploy`.

## Логирование и асинхронный контекст выполнения  

- `GeneralAsyncContext` (**@see** `src/modules/common`)
- `ElkLoggerModule` (**@see** `src/modules/elk-logger`)

## Метрики **Prometheus**

- `PrometheusModule` (**@see** `src/modules/prometheus`).

## **Hybrid Microservice**:  **REST**, **gRPC**

А именно реализована поддержка глобальных **Guard**, **Interceptor**, **Errors Filter**.

- `HybridErrorResponseFilter` ( **@see** `src/modules/hybrid/hybrid-server`)
- `HttpAuthGuard`, `HttpLogging`, `HttpPrometheus`, `HttpHeadersResponse` и многое другое (**@see**  `src/modules/http/http-server`)
- `HttpClientService` (**@see**  `src/modules/http/http-client`)
- `GrpcAuthGuard`, `GrpcLogging`, `GrpcPrometheus` и многое другое (**@see**  `src/modules/grpc/grpc-server`)
- `GrpcClientService` (**@see**  `src/modules/grpc/grpc-client`)

## **Graceful Shutdown**

Реализована логика плавного завершения приложения **Graceful Shutdown**, включающая в себя отслеживание активных процессов и запуск пользовательских сценариев завершения приложения. (**@see** `src/modules/graceful-shutdown`)

## **Health Check Monitor**

Реализован **Health Check Monitor**, включающий в себя методы: `liveness-probe`, `readiness-probe` и `our-metrics`.

## **Postgres**

Организовано подключение к БД  **Postgres** (**@see** `src/modules/database`), механизм отслеживания новых миграций и автоматическое их применение.

## **Redis Cache Manager**

Гибкая настройка соединения с [**Redis**](https://www.npmjs.com/package/@keyv/redis).
По умолчанию используется стандартная конфигурация (`host` и `port`) для подключения к **Redis** (**@see** `src/modules/redis-cache-manager`)

## **Kafka**

Гибкая настройка подключения к **Kafka**, настроен механизм автоматического восстановления соединения с брокером **Kafka**, логирование, метрики и **Health Check**.
Реализована возможность запуска **Consumer** в разных режимах: **eachMessage** и **eachBatch**. (**@see**  `src/modules/kafka/kafka-server`).

[email](mailto:gardsilver@list.ru)
