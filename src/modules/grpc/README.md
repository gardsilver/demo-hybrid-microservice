# Grpc Module

## Описание

Реализован базовый функционал для создания **gRPC**-сервера и **gRPC**-клиента.

- **Grpc Common** (**@see** [`./grpc-common/README.md`](./grpc-common/README.md)) — общие хелперы, билдеры, адаптеры и типы, используемые и `grpc-server`, и `grpc-client`.
- **Grpc Server** (**@see** [`./grpc-server/README.md`](./grpc-server/README.md)) — модуль для создания и настройки **gRPC**-сервера: **Guards**, **Interceptors**, **Filters**, билдер микросервиса, интеграция `gRPC Health Check` и `gRPC Reflection`.
- **Grpc Client** (**@see** [`./grpc-client/README.md`](./grpc-client/README.md)) — модуль для создания **gRPC**-клиента с поддержкой retry, таймаутов, метрик и унифицированной иерархии ошибок.

### ВАЖНО

Все три подмодуля опираются на скомпилированные **proto**-файлы из директории `protos/compiled`. Перед первым запуском / сборкой необходимо выполнить:

```bash
npm run proto-compile        # Linux
npm run proto-compile-win    # Windows
```

Исходные **proto**-определения лежат в `protos/`, а скомпилированные клиенты — в `protos/compiled/`.

### Зависимости между подмодулями

- `grpc-common` не зависит от `grpc-server` / `grpc-client` — наоборот, оба последних импортируют `grpc-common`.
- `grpc-server` переиспользует интерцепторы/гварды и адаптеры заголовков из `http-server` / `http-common` (**@see** корневой `CLAUDE.md`).
- `grpc-client` не зависит от `grpc-server` и может подключаться независимо через `GrpcClientModule.register(...)`.

### Параметры окружения gRPC-сервера

| Параметр окружения (**env**) | Обязательный | Значения | Описание |
|---|---|---|---|
| `GRPC_HOST` | нет. По умолчанию: **0.0.0.0** | string | Хост **gRPC**-сервера. |
| `GRPC_PORT` | да (для запуска **gRPC**-сервера) | number | Порт **gRPC**-сервера. Если не задан — **gRPC**-сервер не запускается. |

Параметры **gRPC**-клиента (`GRPC_CLIENT_*`) описаны в [`./grpc-client/README.md`](./grpc-client/README.md).
