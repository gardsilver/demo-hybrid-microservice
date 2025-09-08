# Redis Cache Manager

## Описание

Настроено кеширование с использованием [**Redis**](https://www.npmjs.com/package/@keyv/redis)

- не блокирует выполнение приложения в случае не доступности **Redis**.
- автоматическое восстановление соединения.
- Гибкая настройка соединения с **Redis**.

## Конфигурация

| Параметры окружения (**env**)| Обязательный| возможные значения | Описание|
|---|---|---|---|
| `REDIS_CACHE_MANAGER_TTL` | нет  | Целое число в миллисекундах | Задает время хранения в **Redis**. Не может быть отключен. По умолчанию: `600_000` ms |
| `REDIS_CACHE_MANAGER_HOST` | нет  | Тип **string**. Регистр учитывается. | Host сервера **Redis**. |
| `REDIS_CACHE_MANAGER_PORT` | нет  | Тип **number** | Port сервера **Redis**. |
| `REDIS_CACHE_MANAGER_MAX_DELAY_BEFORE_RECONNECT` | нет  | Целое число в миллисекундах | Задает максимально возможную паузу между попытками восстановления соединения. По умолчанию: `1200_000` ms  |
| `REDIS_CACHE_MANAGER_COUNT_FOR_RESET_RECONNECT_STRATEGY` | нет  | Тип **number** | Задает максимально количество попыток восстановления соединения. При достижении заданного значения будет зафиксирован лог ошибки о невозможности восстановления соединения с **Redis**. Сценарий повторных попыток будет перезапущен. По умолчанию: `200` |

## `RedisCacheService`

Сервис хеширования данных в **Redis**. Реализует основные методы сохранения данных в хэше с автоматическим использованием `encode`/`decode` или без них.

- `set` - сохраняет данные в хэше с применение `formatter.decode()`. Если не задан тип `formatter`, то будет применен `JsonRedisCacheFormatter`. В случае? если не нужно применять `formatter.decode()`, то нужно явно указать `formatter=false`.
- `get` - возвращает данные сохраненные в хэше с применение `formatter.encode()`. Если не задан тип `formatter`, то будет применен `JsonRedisCacheFormatter`. Если явно указан `formatter=false`, то `formatter.encode()` не будет применен.
- `del` - удаляет сохраненные данные в хэше.
- `clear` - удаляет все сохраненные данные в хэше.

## `JsonRedisCacheFormatter`

Реализует интерфейс `encode`/`decode` (`JSON.parse`/`JSON.stringify`).

## `RedisClientErrorFormatter`

Лог-форматер `ReconnectStrategyError` и `MultiErrorReply` (**@see** `@redis/client`): `IObjectFormatter<ReconnectStrategyError | MultiErrorReply>`.

## `defaultRedisReconnectStrategyBuilder`

Конструктор метода стратегии восстановления соединения с **Redis**: [**see**](https://www.npmjs.com/package/@keyv/redis) Gracefully Handling Errors and Timeouts.
Экспоненциально увеличивает интервал между попытками восстановления соединения, но при этом ограничивает максимальный интервал в пределах `REDIS_CACHE_MANAGER_MAX_DELAY_BEFORE_RECONNECT` ms.
Если количество попыток превысит `REDIS_CACHE_MANAGER_COUNT_FOR_RESET_RECONNECT_STRATEGY`, то будет зафиксирован лог ошибки о невозможности восстановления соединения с **Redis**, зафиксирована метрика `REDIS_CLIENT_RECONNECT_FAILED` и сценарий повторных попыток будет перезапущен.

## Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`REDIS_CLIENT_RECONNECT_FAILED`|  **labelNames** `[]` | Количество не удавшихся переподключений к **Redis**. |
