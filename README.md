# Demo Hybrid Microservice

Минимальное серверное приложение на [Node.js v24](https://nodejs.org) и [NestJS v11](https://nestjs.com), демонстрирующее **гибридную микросервисную архитектуру** с поддержкой нескольких транспортов: **REST (HTTP)**, **gRPC**, **Kafka**, **RabbitMq** и **WebSocket**.

Стек: **TypeScript 5.9 with strict**, **Node.js >= 24**, **PostgreSQL** (Sequelize ORM), **Redis**, **Kafka** (kafkajs), **RabbitMq** (amqp-connection-manager), **gRPC** (`@grpc/grpc-js`, `ts-proto`), **Prometheus**, **Docker**.

Реализован и настроен базовый системный функционал:

- Настроено сквозное логирование в формате **ElasticSearch** с поддержкой пользовательского асинхронного контекста выполнения и возможностью добавления различных лог-форматеров.
- Прозрачность и наблюдаемость за состоянием сервера: метрики **Prometheus** и **Health Check Monitor**.
- Корректное завершение приложения **Graceful Shutdown**.
- Реализовано взаимодействие с базой данных **Postgres**: логирование, базовые метрики, авто-применение миграций.
- Настроено кеширование с использованием **Redis** (не блокирует выполнение приложения в случае недоступности **Redis** и реализовано автоматическое восстановление соединения).
- Настроена интеграция с сервером очередей **Kafka**: автоматическое восстановление соединения, логирование, метрики, запуск консьюмеров `eachMessage` или `eachBatch`, отправка сообщений `send` или `sendBatch` с возможностью переотправки.
- Настроена интеграция с сервером очередей **RabbitMq**: автоматическое восстановление соединения, логирование, метрики, запуск консьюмеров и отправка сообщений.

Добавлен простой `WebSocket`-чат.


## 1. Быстрый старт

Минимальный путь от клонирования до работающего приложения со Swagger.

> В проекте **два** `makefile`: корневой — для сборки/запуска/тестов приложения (в нём также есть shortcut'ы `make dc-*` для Docker), и `deploy/makefile` — полный набор команд для управления Docker-инфраструктурой. Каждая команда ниже снабжена пометкой, **откуда она запускается**.

### 1.1. Предварительные требования

- **Node.js** ≥ 24, **npm** ≥ 10.
- Компилятор [**protobuf**](https://protobuf.dev/installation/) (`protoc`) в `PATH`.
- **Docker** и **Docker Compose** — для локальной инфраструктуры (Postgres, Redis, Kafka, RabbitMQ).


### 1.2. Подъём локальной инфраструктуры и быстрый старт

Можно не производить тонких настроек, а сразу развернуть инфраструктуру и запустить приложение (**из корня проекта**):

```bash
make dc-start           # Поднимает инфраструктуру + микросервис + Docker Compose Watch в фоне
make dc-logs            # Последние 50 строк логов микросервиса с отслеживанием
```

`make dc-start` автоматически запускает **Docker Compose Watch** в фоновом процессе — правки в `src/**` подхватываются без рестарта контейнера (`nest start --watch` сам перезапускает Node-процесс), конфиги и `.env` — через `sync+restart`, `protos/` и `package.json` — через `rebuild`. Лог watch-процесса можно посмотреть через `make dc-watch-log`, перезапустить — через `make dc-watch`. `make dc-down` останавливает и контейнеры, и фоновый watch. Подробности — в [`deploy/README.md`](./deploy/README.md).

После старта доступны:

- <http://127.0.0.1:3000/> — **Swagger UI**.
- <http://127.0.0.1:3000/health/liveness-probe> — liveness.
- <http://127.0.0.1:3000/health/readiness-probe> — readiness.
- <http://127.0.0.1:3000/health/our-metrics> — метрики **Prometheus**.
- <http://127.0.0.1:3000/health/test-jwt-token> — тестовый JWT-токен.
- <http://127.0.0.1:3000/chat> — WebSocket-чат (EJS-вьюха).
- <http://127.0.0.1:3000/api/app> — пример защищённого REST-эндпоинта (`HttpApiController`).
- **gRPC** на `127.0.0.1:3001` с включённым **Reflection-Service**.


В данном случае приложение будет запущено с параметрами окружения заданными по умолчанию [`.example.env`](.example.env). Изменить параметры запуска всегда возможно указав нужные значения в `.env`.

Полный набор docker-команд — в [`deploy/README.md`](./deploy/README.md).


## 2. Настрока приложения, сборка и запуск вне Docker-окружения


### 2.1. Конфигурация окружения

Приложение читает переменные окружения из трёх файлов:

- `.example.env` — **справочник**: перечисляет все доступные переменные с описаниями и значениями, которыми пользуется `deploy/`-инфраструктура. Носит описательный характер, **на работу приложения не влияет**, коммитится в репозиторий. Подробности каждой переменной — в `README.md` соответствующего модуля.
- `.default.env` — **значения по умолчанию**, применяемые автоматически; коммитится в репозиторий.
- `.env` — **параметры текущего развёртывания**; переопределяет `.default.env`, **не коммитится**. Создаётся автоматически командой `make i` (копия из `.example.env`) либо вручную.


### 2.2. Установка зависимостей и компиляция proto

Запускается **из корня проекта**:

```bash
make i                  # npm i + создаст .env из .example.env, если его нет
make proto-compile      # Linux/macOS (или `make proto-compile-win` на Windows)
```


### 2.3. Запуск приложения

Запускается **из корня проекта**:

```bash
make start-dev          # nest start --watch
```


### 2.4. Проверка качества

Запускается **из корня проекта**:

```bash
make lint-all           # ESLint + Prettier
make test-cov           # unit-тесты с покрытием (порог 90% по всем метрикам, зафиксирован в jest.coverageThreshold)
```

## 3. Порты и эндпоинты

| Сервис | Порт | Параметр | Описание |
|---|---|---|---|
| HTTP / Swagger / WebSocket | 3000 | `SERVICE_PORT` | REST API, Swagger UI, WebSocket-чат |
| gRPC | 3001 | `GRPC_PORT` | gRPC-сервер с Reflection-Service |

Глобальный префикс — `/api`, но маршруты `health{*path}` и `chat{*path}` **исключены** из префикса (см. `app.setGlobalPrefix` в [`src/main.ts`](./src/main.ts)).

Эндпоинты, доступные из корня (без `/api`):

- `GET /` — **Swagger UI**.
- `GET /health/liveness-probe` — проверка жизнеспособности (DataBase, graceful-shutdown, Redis, Kafka, RabbitMq). `DatabaseHealthIndicator` идёт с `migrationFailedStatus='up'` — неудача миграций не рестартит pod, но ping БД всё ещё валит probe при реальной потере соединения. `RedisCacheManagerHealthIndicator` — дефолтный `unavailableStatus='up'` (недоступность Redis не роняет probe, отражается в `details` + warning-логах).
- `GET /health/readiness-probe` — проверка готовности (Auth, graceful-shutdown, DataBase, Redis, Kafka, RabbitMq). `DatabaseHealthIndicator` — дефолтный `migrationFailedStatus='down'`: pod не принимает трафик, пока миграции не применены. Redis — аналогично liveness.
- `GET /health/our-metrics` — метрики **Prometheus**.
- `GET /health/test-jwt-token` — тестовый JWT-токен для Swagger.
- `GET /chat` — EJS-вьюха WebSocket-чата (`ChatController`).

Эндпоинты под глобальным префиксом `/api`:

- `GET /api/app` — пример защищённого REST-эндпоинта (`HttpApiController`).

## Пример: bootstrap и вызов HTTP-эндпоинта

Точка входа — [`src/main.ts`](./src/main.ts). Приложение создаётся через `NestFactory.create<NestExpressApplication>(MainModule, ...)`; затем последовательно регистрируются глобальные pipes/filters/guards/interceptors, поднимается HTTP-слой, после чего `GrpcMicroserviceBuilder`, `KafkaMicroserviceBuilder` и `RabbitMqMicroserviceBuilder` подключают остальные транспорты:

```typescript
const app = await NestFactory.create<NestExpressApplication>(MainModule, { logger: nestLogger, bufferLogs: true });

app.useGlobalFilters(app.get(HybridErrorResponseFilter));
app.useGlobalGuards(app.get(HttpAuthGuard), app.get(GrpcAuthGuard));
app.useGlobalInterceptors(
  app.get(HttpLogging), app.get(HttpPrometheus), app.get(HttpHeadersResponse),
  app.get(GrpcLogging), app.get(GrpcPrometheus),
);

GrpcMicroserviceBuilder.setup(app, { /* ... */ });
KafkaMicroserviceBuilder.setup(app, { /* ... */ });
RabbitMqMicroserviceBuilder.setup(app, { /* ... */ });

await app.listen(appConfig.getServicePort());
await app.startAllMicroservices();
```

Пример HTTP-контроллера — [`src/core/api/http/controllers/http.api.controller.ts`](./src/core/api/http/controllers/http.api.controller.ts):

```typescript
@Controller('app')
@ApiTags('app')
@ApiBearerAuth()
export class HttpApiController {
  constructor(private readonly service: HttpApiService) {}

  @Get()
  @GracefulShutdownOnCount()
  async getHello(@HttpGeneralAsyncContext() asyncContext: IGeneralAsyncContext): Promise<string> {
    return GeneralAsyncContext.instance.runWithContextAsync(
      async () => this.service.getHello(),
      asyncContext,
    );
  }
}
```

Проверить работу эндпоинта можно так:

```bash
# Получить тестовый JWT-токен (маршрут /health исключён из глобального префикса /api).
# Эндпоинт возвращает JSON { accessToken, certificate }, поэтому извлекаем accessToken через jq.
TOKEN=$(curl -s http://127.0.0.1:3000/health/test-jwt-token | jq -r .accessToken)

# Вызвать защищённый эндпоинт (глобальный префикс /api + маршрут контроллера /app)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3000/api/app
```

## 4. Команды

Все часто используемые команды указаны в `makefile`.

| **make**-команда | Аналог **npm** | Описание |
|---|---|---|
| `make i` | `npm i` | Создаёт `.env` (если нет) и устанавливает зависимости |
| `make proto-compile` | `npm run proto-compile` | Компиляция **proto**-файлов в Linux (**@see** `compile-protos.js`) |
| `make proto-compile-win` | `npm run proto-compile-win` | Компиляция **proto**-файлов в Windows |
| `make start` | `npm run start` | Запуск без отслеживания изменений |
| `make start-dev` | `npm run start:dev` | Запуск c отслеживанием изменений (`nest start --watch`) |
| — | `npm run start:debug` | Запуск с отладчиком (`nest start --debug --watch`) |
| — | `npm run build` | Сборка (`nest build`) |
| — | `npm run start:prod` | Запуск собранного кода (`node dist/main`) |
| `make rebuild` | `rm -rf dist node_modules` <br> `npm i` <br> `npm run proto-compile` | Полная пересборка в Linux |
| `make rebuild-win` | то же для Windows | Полная пересборка в Windows |
| `make lint` | `npm run format` <br> `npm run lint:diff` | Форматирование + линтинг изменённых файлов (относительно `origin/master`; только Linux) |
| `make lint-all` | `npm run format` <br> `npm run lint:all` | Форматирование + линтинг всего кода |
| `make test` | `npm run test` | Unit-тесты без покрытия |
| `make test-cov` | `npm run test:cov` | Unit-тесты с покрытием (порог 90% по всем метрикам, зафиксирован в `jest.coverageThreshold`) |
| `make test-e2e` | `npm run test:e2e` | End-to-end тесты |
| — | `npm run migrate:generate <имя>` | Генерация новой Sequelize-миграции |
| `make dc-start` | `docker compose ... up -d` + `docker compose ... watch &` | Запуск всех контейнеров (инфраструктура + микросервис) + **Docker Compose Watch в фоне** (hot-sync исходников) |
| `make dc-watch` | `docker compose ... watch &` | Перезапустить фоновый file-sync (если watch-процесс упал) |
| `make dc-down` | `docker compose ... down` | Остановка всех контейнеров **и фонового watch** |
| `make dc-logs` | `docker logs --tail 50 -f demo-hybrid-microservice` | Логи микросервиса с follow |
| `make dc-watch-log` | `tail -f /tmp/docker-compose-$UID/dhms-watch.log` | Лог фонового watch-процесса (сообщения о sync/rebuild) |

## 5. Структура проекта

```
src/
├── main.ts                    # Точка входа, bootstrap всех микросервисов
├── main.module.ts             # Корневой модуль NestJS
├── core/
│   ├── app/                   # Конфигурация, фабрики форматеров
│   ├── api/                   # Бизнес-логика по транспортам (http/grpc/kafka/rabbit-mq/web-socket/common)
│   └── repositories/postgres/ # Модели БД
├── modules/                   # Переиспользуемые инфраструктурные и транспортные модули
├── examples/integrations/     # Примеры клиентских интеграций
└── health/                    # Health Check эндпоинты
protos/                        # Protocol Buffer определения
front/                         # Статические ресурсы и вьюхи (WebSocket-чат)
migrations/                    # Sequelize-миграции
deploy/                        # Docker и Docker Compose
tests/                         # Моки и фабрики для тестов (сами тесты лежат рядом с исходниками в src/)
```


## 6. Документация модулей

Каждый модуль сопровождается собственным `README.md` с описанием назначения, зависимостей и переменных окружения.

### 6.1 Инфраструктурные модули

- **Логирование и async-контекст**: [`src/modules/common`](./src/modules/common/README.md), [`src/modules/elk-logger`](./src/modules/elk-logger/README.md), [`src/modules/async-context`](./src/modules/async-context/README.md), [`src/modules/date-timestamp`](./src/modules/date-timestamp/README.md).
- **Метрики и наблюдаемость**: [`src/modules/prometheus`](./src/modules/prometheus/README.md).
- **Аутентификация**: [`src/modules/auth`](./src/modules/auth/README.md).
- **Жизненный цикл**: [`src/modules/graceful-shutdown`](./src/modules/graceful-shutdown/README.md).
- **Хранилища**: [`src/modules/database`](./src/modules/database/README.md), [`src/modules/redis-cache-manager`](./src/modules/redis-cache-manager/README.md).

### 6.2 Транспортные модули

Каждый транспорт разбит на слои `*-common / *-server / *-client`:

- **HTTP**: [`src/modules/http`](./src/modules/http/README.md).
- **gRPC**: [`src/modules/grpc`](./src/modules/grpc/README.md).
- **Kafka**: [`src/modules/kafka`](./src/modules/kafka/README.md).
- **RabbitMq**: [`src/modules/rabbit-mq`](./src/modules/rabbit-mq/README.md).
- **Hybrid (агрегатор)**: [`src/modules/hybrid/hybrid-server`](./src/modules/hybrid/hybrid-server/README.md) — `HybridErrorResponseFilter`, общий error-filter, объединяющий все транспортные `*-server` модули.

## 7. Локальная среда разработки

Добавлены параметры конфигурации **docker-compose** и настроены часто используемые команды, позволяющие быстро поднимать минимально-необходимое окружение и эмулировать различные аварийные ситуации (например, отказ **Postgres** или другой интеграции). Подробнее — в [`deploy/README.md`](./deploy/README.md).


## 8. Известные проблемы

**kafkajs: TimeoutNegativeWarning** — при запуске в логах может появиться:

```
(node:XX) TimeoutNegativeWarning: -XXXXXXXXXX is a negative number.
Timeout duration was set to 1.
```

Причина — баг в kafkajs (`node_modules/kafkajs/src/consumer/index.js:300`): в `KafkaJSNumberOfRetriesExceeded` сохраняется экспоненциально выросшее значение `retryTime`, которое передаётся в `setTimeout()`. В Node < 24 это молча приводилось к 1 мс, в Node 24 — выдаёт warning в stderr. На работу приложения warning не влияет. При необходимости подавить его — добавить `--disable-warning=TimeoutNegativeWarning` в `NODE_OPTIONS`.

[email](mailto:gardsilver@list.ru)
