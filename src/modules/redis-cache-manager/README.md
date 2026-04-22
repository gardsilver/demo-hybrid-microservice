# Redis Cache Manager

## Описание

Настроено кеширование с использованием [**Redis**](https://www.npmjs.com/package/@keyv/redis)

- не блокирует выполнение приложения в случае не доступности **Redis**.
- автоматическое восстановление соединения.
- Гибкая настройка соединения с **Redis**.

Модуль регистрируется как **global** через `forRoot()` и экспортирует `RedisCacheService`.

### Опции `forRoot(options?: IRedisCacheManagerModuleOptions)`

Все поля опциональны; при вызове без аргументов параметры подключения берутся из env (`REDIS_CACHE_MANAGER_*`).

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` | нет | `[]` | Дополнительные модули, пробрасываемые в `CacheModule.registerAsync`. Используются, если для построения `redisClientOptions` / `keyvRedisOptions` нужны сторонние провайдеры. |
| `providers` | `Provider[]` | нет | `[]` | Дополнительные провайдеры, регистрируемые как внутри модуля, так и внутри асинхронного `CacheModule`. |
| `ttl` | `number` | нет | `REDIS_CACHE_MANAGER_TTL` (`600000` мс) | Переопределение TTL записи в миллисекундах. Если не задан — используется значение из env. Применяется как дефолт для `RedisCacheService.set()` и декоратора `RedisCacheOnAsyncMethod`. |
| `redisClientOptions` | `IServiceClassProvider<RedisClientOptions>` \| `IServiceFactoryProvider<RedisClientOptions>` \| `IServiceValueProvider<RedisClientOptions>` | нет | Фабрика из `REDIS_CACHE_MANAGER_HOST` / `REDIS_CACHE_MANAGER_PORT` с `disableOfflineQueue=true` и `defaultRedisReconnectStrategyBuilder` | Переопределение опций клиента `@redis/client`. Если пользовательские опции не задают `socket.reconnectStrategy`, модуль автоматически подставляет дефолтную стратегию. `disableOfflineQueue` всегда принудительно `true`. |
| `keyvRedisOptions` | `IServiceClassProvider<KeyvRedisOptions>` \| `IServiceFactoryProvider<KeyvRedisOptions>` \| `IServiceValueProvider<KeyvRedisOptions>` | нет | `{ useUnlink: false, throwOnConnectError: false, throwOnErrors: false }` | Переопределение опций обёртки `@keyv/redis`. |

Если пользовательские `redisClientOptions` не задают свой `socket.reconnectStrategy`, модуль автоматически подставляет стратегию `defaultRedisReconnectStrategyBuilder`. Также принудительно включается `disableOfflineQueue = true`, чтобы запросы к недоступному Redis падали сразу, а не копились в очереди.

## Параметры окружения

| Параметры окружения (**env**)| Обязательный| возможные значения | Описание|
|---|---|---|---|
| `REDIS_CACHE_MANAGER_TTL` | нет. По умолчанию: `600000`  | Целое число в миллисекундах | Задает время хранения в **Redis**. Не может быть отключен. |
| `REDIS_CACHE_MANAGER_HOST` | нет. По умолчанию: `redis`  | Тип **string**. Регистр учитывается. | Host сервера **Redis**. |
| `REDIS_CACHE_MANAGER_PORT` | нет  | Тип **number** | Port сервера **Redis**. |
| `REDIS_CACHE_MANAGER_MAX_DELAY_BEFORE_RECONNECT` | нет. По умолчанию: `1200000`  | Целое число в миллисекундах | Задает максимально возможную паузу между попытками восстановления соединения. |
| `REDIS_CACHE_MANAGER_COUNT_FOR_RESET_RECONNECT_STRATEGY` | нет. По умолчанию: `200`  | Тип **number** | Задает максимальное количество попыток восстановления соединения. При достижении заданного значения будет зафиксирован лог ошибки о невозможности восстановления соединения с **Redis**. Сценарий повторных попыток будет перезапущен. |

## `RedisCacheService`

Сервис хеширования данных в **Redis**. Реализует основные методы сохранения данных в хэше с автоматическим использованием `encode`/`decode` или без них.

- `set` - сохраняет данные в хэше с применение `adapter.decode()`. Если не задан `adapter`, то будет применен `JsonRedisCacheAdapter`. В случае, если не нужно применять `adapter.decode()`, то нужно явно указать `adapter=false`.
- `get` - возвращает данные сохраненные в хэше с применение `adapter.encode()`. Если не задан `adapter`, то будет применен `JsonRedisCacheAdapter`. Если явно указан `adapter=false`, то `adapter.encode()` не будет применен.
- `del` - удаляет сохраненные данные в хэше.
- `clear` - удаляет все сохраненные данные в хэше.

## Декоратор `RedisCacheOnAsyncMethod`

Для кэширования результата асинхронного метода можно использовать декоратор `RedisCacheOnAsyncMethod`. Принимает объект со следующими полями:

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `cacheKeyAdapter` | `(...args: any[]) => string` | да | Функция формирования ключа кэша из аргументов декорируемого метода. Вызывается на каждый вызов метода. |
| `adapter` | `IRedisCacheAdapter \| false` | нет | Адаптер `encode`/`decode` значения. По умолчанию — `JsonRedisCacheAdapter`. `false` отключает адаптер (значение пишется/читается «как есть»). |
| `ttl` | `number` | нет | TTL записи в миллисекундах. По умолчанию — `REDIS_CACHE_MANAGER_TTL` из конфигурации модуля. |

Поведение: при попадании в кэш (значение `!== undefined`) — возвращается закэшированный результат без вызова оригинального метода. Иначе — вызывается оригинальный метод, и если результат truthy, он асинхронно сохраняется в Redis (без `await`).

## `JsonRedisCacheAdapter`

Реализует интерфейс `encode`/`decode` (`JSON.parse`/`JSON.stringify`).

## `RedisClientErrorFormatter`

Лог-форматер `ReconnectStrategyError` и `MultiErrorReply` (**@see** `@redis/client`): `IObjectFormatter<ReconnectStrategyError | MultiErrorReply>`.

## `RedisCacheManagerHealthIndicator`

Health-индикатор (`@nestjs/terminus`), экспортируемый модулем. Публичный токен redis-клиента — `REDIS_CACHE_MANAGER_REDIS_CLIENT_DI` (инжектится индикатором из `cacheManager.stores[0]`).

```ts
isHealthy(options?: { unavailableStatus?: 'up' | 'down' }): Promise<HealthIndicatorResult>
```

- Проверяет `RedisClient.isReady`; если клиент готов — отправляет `PING` и ожидает `PONG`.
- В `details` **всегда** отражает фактическое состояние: `isOpen`, `isReady` и результат `ping` (`PONG`, текст ошибки, фактический ответ не-`PONG` или `skipped`, если клиент не готов).
- Поведение статуса в зависимости от `unavailableStatus`:
  - `up` (по умолчанию): индикатор возвращает `up`. Соответствует архитектурному правилу «Redis не блокирует выполнение приложения»: probe остаётся зелёным, фактическое состояние видно в `details`.
  - `down`: индикатор возвращает `down`. Используется, когда недоступность Redis должна ронять probe.
- Warning-лог `"Redis is unavailable — probe reports up due to unavailableStatus option"` с `payload` из `details` и полем `exception` пишется **только** при одновременном выполнении двух условий:
  1. `PING` был фактически выполнен (клиент `isReady`), но вернул не `PONG` или упал с ошибкой;
  2. `unavailableStatus === 'up'` — т. е. probe искусственно возвращает зелёный статус, и оператор должен видеть, что он скрывает реальную проблему.
- Для `unavailableStatus === 'down'` доп. лог не пишется: probe красный и так виден, а оригинальные ошибки redis-клиента пишутся reconnect-стратегией (`defaultRedisReconnectStrategyBuilder`).
- Если клиент не готов (`isReady === false`, `ping === 'skipped'`) — индикатор **никогда** не пишет лог, чтобы не дублировать сообщения reconnect-стратегии. Статус (`up`/`down`) всё равно подчиняется `unavailableStatus`, а фактическое состояние отражено в `details`.

Пример:

```ts
@Get('liveness-probe')
async liveness() {
  return this.health.check([
    () => this.redisHealth.isHealthy(),                           // default: unavailableStatus='up'
    () => this.redisHealth.isHealthy({ unavailableStatus: 'down' }), // строгий режим
  ]);
}
```

## `defaultRedisReconnectStrategyBuilder`

Конструктор метода стратегии восстановления соединения с **Redis**: [**see**](https://www.npmjs.com/package/@keyv/redis) Gracefully Handling Errors and Timeouts.
Экспоненциально увеличивает интервал между попытками восстановления соединения, но при этом ограничивает максимальный интервал в пределах `REDIS_CACHE_MANAGER_MAX_DELAY_BEFORE_RECONNECT` ms.
Если количество попыток превысит `REDIS_CACHE_MANAGER_COUNT_FOR_RESET_RECONNECT_STRATEGY`, то будет зафиксирован лог ошибки о невозможности восстановления соединения с **Redis**, зафиксирована метрика `REDIS_CLIENT_RECONNECT_FAILED` и сценарий повторных попыток будет перезапущен.

## Пример использования

Регистрация модуля (без аргументов — параметры подключения берутся из env `REDIS_CACHE_MANAGER_*`):

```ts
import { Module } from '@nestjs/common';
import { RedisCacheManagerModule } from 'src/modules/redis-cache-manager';

@Module({
  imports: [RedisCacheManagerModule.forRoot()],
})
export class MainModule {}
```

Если пользовательские `redisClientOptions` / `keyvRedisOptions` зависят от провайдеров из других модулей, их нужно явно подключить через `imports`:

```ts
RedisCacheManagerModule.forRoot({
  imports: [MyAuthModule],
  redisClientOptions: {
    inject: [MyAuthService],
    useFactory: (auth: MyAuthService) => ({
      url: auth.getRedisUrl(),
    }),
  },
});
```

Чтение/запись через `RedisCacheService`:

```ts
import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/modules/redis-cache-manager';

@Injectable()
export class UserCacheService {
  constructor(private readonly cache: RedisCacheService) {}

  public async getUser(id: number): Promise<IUser | undefined> {
    // encode через JsonRedisCacheAdapter по умолчанию
    return (await this.cache.get<IUser>(`user:${id}`)) as IUser | undefined;
  }

  public async setUser(user: IUser): Promise<void> {
    // decode через JsonRedisCacheAdapter; ttl можно переопределить точечно
    await this.cache.set(`user:${user.id}`, user, { ttl: 60_000 });
  }

  public async invalidate(id: number): Promise<void> {
    await this.cache.del(`user:${id}`);
  }
}
```

Кэширование результата метода через декоратор:

```ts
import { RedisCacheOnAsyncMethod } from 'src/modules/redis-cache-manager';

@Injectable()
export class UserService {
  @RedisCacheOnAsyncMethod({
    cacheKeyAdapter: (id: number) => `user:${id}`,
    ttl: 60_000,
  })
  public async findUser(id: number): Promise<IUser | null> {
    // тяжёлое чтение из БД — результат сохраняется в Redis до истечения ttl
  }
}
```

## Метрики

| Метрика| Метки |Описание|
|---|---|---|
|`REDIS_CLIENT_RECONNECT_FAILED`|  **labelNames** `[]` | Количество не удавшихся переподключений к **Redis**. |
