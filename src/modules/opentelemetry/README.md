# OpenTelemetry Module

Модуль интеграции **OpenTelemetry (W3C Trace Context)** в экосистему **NestJS**. Обеспечивает сквозную синхронизацию распределенной трассировки (Jaeger/OTel Collector) и асинхронного контекста логирования (ELK Stack).

## Главная особенность

В отличие от стандартных библиотек, данный модуль **гарантирует 100% совпадение `traceId` и `spanId`** между логами в Kibana и спанами в Jaeger.
При входящем запросе OpenTelemetry SDK управляет генерацией ID (W3C hex формат), а бизнес-логика логов бесшовно считывает их из активного контекста Node.js, устраняя рассинхронизацию.

---

## Архитектура и компоненты

1. **`OpentelemetryBuilder`** — Инициализирует и запускает NodeSDK OpenTelemetry строго до компиляции и старта самого NestJS. Реализован как паттерн Singleton.
2. **`PropagatorBuilder`** — Создает инжектор/экстрактор заголовков. Нормализует входящие UUID/Zipkin форматы до стандартов W3C (32/16 hex) и защищает заголовки от перезаписи бизнес-логикой.
3. **`OpentelemetryConfig`** — Модуль конфигурации. Считывает переменные окружения, интегрирован с Prometheus и механизмами Graceful Shutdown.
4. **`OpentelemetryService`** — Связующий сервис NestJS. Перехватывает события жизненного цикла приложения и корректно закрывает сетевые соединения с коллектором.

---

## Настройка и подключение

### 1. Переменные окружения (.env)

| Параметр окружения (**env**) | Обязательный | Значения | Описание |
|---|---|---|---|
| `OPENTELEMETRY_URL` | нет. По умолчанию: **http://localhost:4318/v1/traces** | string | Коллектор телеметрии |

### 2. Инициализация в `main.ts` (Критически важно!)

Из-за особенностей кэширования модулей в **Node.js**, **OpenTelemetry** должен запускаться **строго до** импорта фреймворка **NestJS**:

`src/init.ts`

```typescript
import { OpentelemetryBuilder } from 'src/modules/opentelemetry';  // Это импорт всегда должен быть первым
import { ConfigService } from '@nestjs/config';
import { NestElkLoggerServiceBuilder } from 'src/modules/elk-logger';

// Собираем вне NestJS приложения.
function init() {
  const initConfigService = new ConfigService(); // Автоматически подтягивает только `.env`
  const nestLogger = NestElkLoggerServiceBuilder.build({ configService: initConfigService });

  OpentelemetryBuilder.build(initConfigService, nestLogger);
}

```

`src/main.ts`

```typescript
import { init } from './init'; // Это импорт всегда должен быть первым
import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';

async function bootstrap() {
  const app = await NestFactory.create(MainModule, { bufferLogs: true });
  await app.listen(3000);
}

init();
bootstrap();
```

### 3. Подключение модуля в NestJS

Для того, что бы автоматически корректно закрывались сетевые соединения с коллектором, необходимо наряду с **GracefulShutdownModule** (`src/modules/graceful-shutdown`) импортировать **OpentelemetryModule** в ваш корневой **MainModule**:

```typescript
import { Module } from '@nestjs/common';
import { GracefulShutdownModule } from 'src/modules/graceful-shutdown';
import { OpentelemetryModule } from 'src/modules/opentelemetry';

@Module({
  imports: [
    ...
    OpentelemetryModule,
    ...
    GracefulShutdownModule.forRoot(),
    ...
  ],
})
export class MainModule {}
```

---

## Схема движения контекста

### Входящий запрос (Request)

1. **`Propagator.extract`** перехватывает HTTP-запрос. Если заголовков нет, SDK генерирует новые. Если есть — нормализует их до `hex`.
2. В интерцепторе вызывается **`HttHeadersHelper.toAsyncContext(headers)`**, который забирает `traceId` и `spanId` из `context.active()` OpenTelemetry.
3. Формируется контекст лога:
   * `spanId` — уникальный ID текущего процесса (всегда равен значению из OTEL).
   * `parentSpanId` — ID внешнего микросервиса (если запроса не было, в лог пишется `""`, чтобы не ломать маппинг Kibana и семантику OTel).

### Исходящий запрос (HttpClient / Axios)

1. Автоматическое инструментирование OpenTelemetry создает дочерний спан.
2. **`Propagator.inject`** проверяет заголовки: если ваш бизнес-код уже зафиксировал `x-span-id`, пропагатор **не перезаписывает** его, сохраняя целостность логов.
