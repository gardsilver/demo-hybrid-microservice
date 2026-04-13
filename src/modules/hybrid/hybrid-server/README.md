# Hybrid Server Module

## Описание

Модуль-агрегатор серверной части всех транспортов гибридного микросервиса. `HybridServerModule` импортирует все `*-server` модули (**HTTP**, **gRPC**, **Kafka**, **RabbitMQ**) и предоставляет общий для всех транспортов обработчик ошибок `HybridErrorResponseFilter`, а также вспомогательный `LoggingValidationPipe`.

Зависимости модуля:

- `ElkLoggerModule` — сквозное логирование.
- `HttpServerModule`, `GrpcServerModule`, `KafkaServerModule`, `RabbitMqServerModule` — серверные модули соответствующих транспортов. Каждый из них уже регистрируется как `global: true`.

Экспортирует:

- `HybridErrorResponseFilter` — глобальный фильтр ошибок гибридного сервера.

## `HybridErrorResponseFilter`

Перехватывает любые ошибки, возникшие при обработке запроса или сообщения. Определяет тип текущего контекста выполнения (`ArgumentsHost`) и делегирует обработку соответствующему транспортному фильтру:

| Контекст | Проверка | Делегирование |
|---|---|---|
| HTTP | `host.getType() === 'http'` | `HttpErrorResponseFilter` |
| gRPC | `GrpcHelper.isGrpc(host)` | `GrpcErrorResponseFilter` |
| Kafka | `KafkaServerHelper.isKafka(host)` | `KafkaErrorFilter` |
| RabbitMQ | `RabbitMqHelper.isRabbitMq(host)` | `RabbitMqErrorFilter` |
| прочий `rpc` | `host.getType() === 'rpc'` | `BaseRpcExceptionFilter` (`@nestjs/microservices`) |

### ВАЖНО

Транспортные фильтры (`HttpErrorResponseFilter`, `GrpcErrorResponseFilter`, `KafkaErrorFilter`, `RabbitMqErrorFilter`) **НЕ должны** регистрироваться глобально по отдельности. Они подключаются только через `HybridErrorResponseFilter` (глобально) или точечно через `@UseFilters` (**@see** `@nestjs/common`).

## Подключение

### Импорт модуля

`HybridServerModule` — **статический** `@Module`. Он не реализует `forRoot()` / `register()` и не принимает параметров: импортируется напрямую как класс. Вся конфигурация выполняется во вложенных транспортных `*-server` модулях (каждый из них уже зарегистрирован глобально).

```ts
import { Module } from '@nestjs/common';
import { HybridServerModule } from 'src/modules/hybrid/hybrid-server';

@Module({
  imports: [
    ...
    HybridServerModule,
    ...
  ],
})
export class MainModule {}
```

Состав `HybridServerModule`:

| Секция | Значение | Описание |
|---|---|---|
| `imports` | `ElkLoggerModule`, `HttpServerModule`, `GrpcServerModule`, `KafkaServerModule`, `RabbitMqServerModule` | Все транспортные серверные модули и общий логгер. Каждый из транспортных модулей регистрируется как `global: true` в собственных `forRoot()`. |
| `providers` | `HybridErrorResponseFilter` | Глобальный фильтр, делегирующий обработку ошибок транспортным фильтрам. |
| `exports` | `HybridErrorResponseFilter` | Экспортируется для подключения через `app.useGlobalFilters(...)` в `main.ts`. |

Параметры (`forRoot` / `register`): **нет** — модуль не принимает опций.

### Глобальная регистрация фильтра

В `main.ts` (**@see** `src/main.ts`):

```ts
import { HybridErrorResponseFilter, LoggingValidationPipe } from 'src/modules/hybrid/hybrid-server';
...
app.useGlobalFilters(app.get(HybridErrorResponseFilter));
```

## `LoggingValidationPipe`

Наследник `ValidationPipe` (**@see** `@nestjs/common`), который в случае ошибки валидации DTO пишет лог (`error`) с исходным значением и выбрасывает оригинальную ошибку дальше.

Подключается в `main.ts` совместно со стандартным `ValidationPipe`:

```ts
import { ELK_LOGGER_SERVICE_BUILDER_DI } from 'src/modules/elk-logger';
import { LoggingValidationPipe } from 'src/modules/hybrid/hybrid-server';
...
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
  new LoggingValidationPipe(app.get(ELK_LOGGER_SERVICE_BUILDER_DI)),
);
```
