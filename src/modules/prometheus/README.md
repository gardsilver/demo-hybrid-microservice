# Prometheus Module

## Описание

Модуль метрик на базе [prom-client](https://www.npmjs.com/package/prom-client).

Выполняет инициализацию общего `Registry`, авто-регистрацию новых метрик при первом обращении и неблокирующую обработку ошибок (все сбои уходят в лог через `PrometheusEventService`). Поддерживаются все основные типы метрик: `Counter`, `Gauge`, `Histogram`, `Summary`.

Модуль подключается в `MainModule` обычным `imports: [PrometheusModule]` (не `DynamicModule` и не `@Global()`); конфигурация читается из env и задаёт три общие метки, автоматически добавляемые ко всем метрикам:

```ts
{
  application: string,
  microservice: string,
  version: string,
}
```

## Публичное API

| Export | Тип | Назначение |
|---|---|---|
| `PrometheusModule` | `Module` | Глобальный модуль, подключается как `PrometheusModule`. |
| `PrometheusManager` | `class` | Единая точка входа: `counter()`, `gauge()`, `histogram()`, `summary()`, `getMetrics()`, `getRegistry()`, `getRegistryMetricNames()`. |
| `PROMETHEUS_COUNTER_SERVICE_DI` | `Symbol` | Токен `ICounterService`. |
| `PROMETHEUS_GAUGE_SERVICE_DI` | `Symbol` | Токен `IGaugeService`. |
| `PROMETHEUS_HISTOGRAM_SERVICE_DI` | `Symbol` | Токен `IHistogramService`. |
| `PROMETHEUS_SUMMARY_SERVICE_DI` | `Symbol` | Токен `ISummaryService`. |
| `@PrometheusMetricConfigOnService` / `@PrometheusOnMethod` | декораторы | Декларативное снятие метрик с методов класса. |
| `IMetricConfig`, `ICounterMetricConfig`, `IGaugeMetricConfig`, `IHistogramMetricConfig`, `ISummaryMetricConfig` | интерфейсы | Конфигурация конкретной метрики. |
| `MetricType` | enum | `COUNTER` / `GAUGE` / `HISTOGRAM` / `SUMMARY`. |
| `REQUEST_BUCKETS` | const | Стандартный набор buckets для `Histogram` по длительностям запросов. |

## Конфигурация подключения

`PrometheusModule` подключается как обычный `@Module` (не `DynamicModule`) — метод `forRoot()` **не предоставляется**, опции не принимаются. Весь набор настроек читается из переменных окружения через `PrometheusConfig`.

```ts
import { Module } from '@nestjs/common';
import { PrometheusModule } from 'src/modules/prometheus';

@Module({
  imports: [PrometheusModule],
})
export class MainModule {}
```

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| — | — | — | — | `PrometheusModule` не принимает аргументов при импорте. Настройка выполняется через env-переменные (см. раздел ниже). |

## Параметры окружения

| Переменная | Тип | По умолчанию | Значения | Описание |
|---|---|---|---|---|
| `APPLICATION_NAME` | string | — | Любая строка с учётом регистра | Значение метки `application`. |
| `MICROSERVICE_NAME` | string | — | Любая строка с учётом регистра | Значение метки `microservice`. |
| `MICROSERVICE_VERSION` | string | — | Любая строка с учётом регистра | Значение метки `version`. |

## `PrometheusManager`

Единый фасад над всеми метриками:

| Метод | Возвращает |
|---|---|
| `counter()` | `ICounterService` |
| `gauge()` | `IGaugeService` |
| `histogram()` | `IHistogramService` |
| `summary()` | `ISummaryService` |
| `getMetrics()` | `Promise<string>` — текущие данные всех метрик в формате Prometheus exposition. |
| `getRegistry()` | прямой доступ к `Registry` из `prom-client`. |
| `getRegistryMetricNames()` | `string[]` — список зарегистрированных имён метрик. |

```ts
import { Injectable } from '@nestjs/common';
import { PrometheusManager } from 'src/modules/prometheus';

@Injectable()
export class HealthService {
  constructor(private readonly prometheusManager: PrometheusManager) {}

  async snapshot(): Promise<string> {
    return this.prometheusManager.getMetrics();
  }
}
```

## Паттерн регистрации метрик (`*.metrics.ts`)

Каждый транспорт (и любой модуль, собирающий метрики) описывает конфигурации метрик в отдельном файле `*.metrics.ts` как константы модульного уровня. Пример из HTTP-сервера (`src/modules/http/http-server/types/metrics.ts`):

```ts
import { ICounterMetricConfig, IHistogramMetricConfig, REQUEST_BUCKETS } from 'src/modules/prometheus';

export const HTTP_INTERNAL_REQUEST_DURATIONS: IHistogramMetricConfig = {
  name: 'http_internal_request_durations',
  help: 'Гистограмма длительностей выполнения серверных запросов HTTP и их количество.',
  labelNames: ['method', 'service', 'pathname'],
  buckets: REQUEST_BUCKETS,
};

export const HTTP_INTERNAL_REQUEST_FAILED: ICounterMetricConfig = {
  name: 'http_internal_request_failed',
  help: 'Количество серверных запросов HTTP с ошибками.',
  labelNames: ['method', 'service', 'pathname', 'statusCode'],
};
```

При первом вызове `counter/gauge/histogram/summary` с такой конфигурацией метрика автоматически регистрируется в `Registry`. Имена метрик — `UPPER_SNAKE_CASE`, сами метрики в выдаче Prometheus — `snake_case`.

### Сервисы отдельных типов метрик

```ts
import { Inject, Injectable } from '@nestjs/common';
import {
  PROMETHEUS_COUNTER_SERVICE_DI,
  ICounterService,
  PROMETHEUS_HISTOGRAM_SERVICE_DI,
  IHistogramService,
} from 'src/modules/prometheus';
import { HTTP_INTERNAL_REQUEST_DURATIONS, HTTP_INTERNAL_REQUEST_FAILED } from './types/metrics';

@Injectable()
export class HttpMetricsReporter {
  constructor(
    @Inject(PROMETHEUS_COUNTER_SERVICE_DI)
    private readonly counterService: ICounterService,
    @Inject(PROMETHEUS_HISTOGRAM_SERVICE_DI)
    private readonly histogramService: IHistogramService,
  ) {}

  reportFailure(method: string, service: string, pathname: string, statusCode: number): void {
    this.counterService.increment(HTTP_INTERNAL_REQUEST_FAILED, {
      labels: { method, service, pathname, statusCode: String(statusCode) },
    });
  }

  startTimer(method: string, service: string, pathname: string): (labels?: Record<string, string>) => number {
    return this.histogramService.startTimer(HTTP_INTERNAL_REQUEST_DURATIONS, {
      labels: { method, service, pathname },
    });
  }
}
```

Аналогично работают `IGaugeService` (`increment` / `decrement` / `get`) и `ISummaryService` (`observe` / `startTimer`).

## Интерфейсы сервисов

```ts
interface ICounterService {
  increment(metricConfig: ICounterMetricConfig, params?: ICounterParams): void;
  get(metricConfig: ICounterMetricConfig): Promise<ICounterMetricValues | undefined>;
}

interface IGaugeService {
  increment(metricConfig: IGaugeMetricConfig, params?: IGaugeParams): void;
  decrement(metricConfig: IGaugeMetricConfig, params?: IGaugeParams): void;
  get(metricConfig: IGaugeMetricConfig): Promise<IGaugeMetricValues | undefined>;
}

interface IHistogramService {
  observe(metricConfig: IHistogramMetricConfig, params: IHistogramParams): void;
  startTimer(
    metricConfig: IHistogramMetricConfig,
    params?: Partial<IParamsPrometheusLabels>,
  ): (labels?: PrometheusLabels) => number;
}

interface ISummaryService {
  observe(metricConfig: ISummaryMetricConfig, params: ISummaryParams): void;
  startTimer(
    metricConfig: ISummaryMetricConfig,
    params?: Partial<IParamsPrometheusLabels>,
  ): (labels?: PrometheusLabels) => number;
}
```

## Декораторы `@PrometheusMetricConfigOnService` и `@PrometheusOnMethod`

Декларативный способ снимать метрики с методов. `@PrometheusMetricConfigOnService` задаёт дефолтные `labels` и конфиги метрик на уровне класса, `@PrometheusOnMethod` описывает хуки `before`, `after`, `throw`, `finally`, `custom` вокруг вызова метода. При использовании метрик длительностей (`Histogram` / `Summary`) с `startTimer` в хуке `before` — `end` вызывается автоматически в `finally`.

```ts
import { Injectable } from '@nestjs/common';
import {
  PrometheusMetricConfigOnService,
  PrometheusOnMethod,
} from 'src/modules/prometheus';
import { HTTP_INTERNAL_REQUEST_DURATIONS, HTTP_INTERNAL_REQUEST_FAILED } from './types/metrics';

@PrometheusMetricConfigOnService({
  labels: () => ({ service: 'MyService' }),
  histogram: () => HTTP_INTERNAL_REQUEST_DURATIONS,
  counter: () => HTTP_INTERNAL_REQUEST_FAILED,
})
@Injectable()
export class MyService {
  @PrometheusOnMethod({
    labels: ({ methodsArgs }) => ({ method: String(methodsArgs[0]) }),
    before: { histogram: { startTimer: true } },
    throw: { counter: { increment: true } },
  })
  handle(method: string) {
    /* ... */
  }
}
```

### Параметры `@PrometheusMetricConfigOnService`

Декоратор класса. Задаёт дефолтные лейблы и конфигурации метрик, которые по умолчанию используются всеми `@PrometheusOnMethod` внутри класса. Каждое поле принимает либо значение, либо функцию-фабрику (вычисляется один раз при применении декоратора), либо `false` (отключено). Все поля опциональны. Если аргумент не передан — все поля считаются `false`.

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `labels` | `PrometheusLabels \| false \| (() => PrometheusLabels \| false)` | нет | Дефолтные лейблы, добавляемые ко всем метрикам класса. |
| `counter` | `ICounterMetricConfig \| false \| (() => ICounterMetricConfig \| false)` | нет | Конфиг счётчика по умолчанию (`name`, `help`, `labelNames`). |
| `gauge` | `IGaugeMetricConfig \| false \| (() => IGaugeMetricConfig \| false)` | нет | Конфиг gauge по умолчанию. |
| `histogram` | `IHistogramMetricConfig \| false \| (() => IHistogramMetricConfig \| false)` | нет | Конфиг histogram по умолчанию (включая `buckets`). |
| `summary` | `ISummaryMetricConfig \| false \| (() => ISummaryMetricConfig \| false)` | нет | Конфиг summary по умолчанию (включая `percentiles`). |

### Параметры `@PrometheusOnMethod`

Декоратор метода. Описывает хуки вокруг вызова. Каждый хук может быть объектом `IPrometheusEventConfig`, `false` (пропустить событие), либо функцией, принимающей контекст вызова и возвращающей одно из вышеперечисленных. Значение `metricConfig` в хуке опционально — при отсутствии берётся из `@PrometheusMetricConfigOnService`.

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `labels` | `PrometheusLabels \| false \| ((opts: { labels?, methodsArgs? }) => PrometheusLabels \| false)` | нет | Лейблы, специфичные для метода. Мёржатся поверх `labels` класса. |
| `before` | `IPrometheusEventConfig \| false \| ((opts: { labels?, methodsArgs? }) => ...)` | нет | Действие перед вызовом. Для histogram/summary здесь доступен только `startTimer` (не `observe` / `end`). |
| `after` | `IPrometheusEventConfig \| false \| ((opts: { result?, duration?, labels?, methodsArgs? }) => ...)` | нет | Действие после успешного вызова. Для histogram/summary доступен только `observe` (не `startTimer` / `end`). |
| `throw` | `IPrometheusEventConfig \| false \| ((opts: { error, duration?, labels?, methodsArgs? }) => ...)` | нет | Действие при выбросе исключения. Доступен `observe`. |
| `finally` | `IPrometheusEventConfig \| false \| ((opts: { duration?, labels?, methodsArgs? }) => ...)` | нет | Действие в блоке `finally`. Доступен `observe`. Если в `before` был `startTimer` — `end` вызывается автоматически. |

Вложенная структура `IPrometheusEventConfig`:

| Поле | Тип | Описание |
|---|---|---|
| `counter.increment` | `Partial<{ metricConfig: ICounterMetricConfig, params: ICounterParams }> \| boolean` | Инкрементировать счётчик. `true` — с дефолтами из конфига класса. |
| `gauge.increment` | `Partial<{ metricConfig: IGaugeMetricConfig, params: IGaugeParams }> \| boolean` | Инкрементировать gauge. |
| `gauge.decrement` | `Partial<{ metricConfig: IGaugeMetricConfig, params: IGaugeParams }> \| boolean` | Декрементировать gauge. |
| `histogram.startTimer` | `Partial<{ metricConfig: IHistogramMetricConfig, params: IHistogramParams }> \| boolean` | Стартовать таймер histogram (только в `before`). |
| `histogram.observe` | `Partial<{ metricConfig: IHistogramMetricConfig, params: IHistogramParams }> \| boolean` | Зафиксировать значение (только в `after` / `throw` / `finally`). |
| `histogram.end` | `Partial<IParamsPrometheusLabels> \| false` | Параметры для автоматического завершения таймера в `finally` (только в `finally`). |
| `summary.startTimer` | `Partial<{ metricConfig: ISummaryMetricConfig, params: ISummaryParams }> \| boolean` | Аналогично histogram. |
| `summary.observe` | `Partial<{ metricConfig: ISummaryMetricConfig, params: ISummaryParams }> \| boolean` | Аналогично histogram. |
| `summary.end` | `Partial<IParamsPrometheusLabels> \| false` | Аналогично histogram. |
| `custom` | `((opts: PrometheusEventArgs & { prometheusManager }) => void) \| false` | Произвольный колбэк с доступом к `PrometheusManager`. |

## Примеры интеграции

HTTP-сервер: `HttpPrometheusInterceptor` (`src/modules/http/http-server/interceptors/http.prometheus.ts`) — глобальный interceptor, который использует `IHistogramService.startTimer` с `HTTP_INTERNAL_REQUEST_DURATIONS` для каждой входящей HTTP-транзакции и инкрементирует `HTTP_INTERNAL_REQUEST_FAILED` при ошибках. Аналогичные interceptors/subscribers есть у gRPC, Kafka и RabbitMQ транспортов — все они опираются на `PrometheusManager` и соответствующие `*.metrics.ts`.

Health-эндпоинт `GET /api/health/our-metrics` отдаёт результат `PrometheusManager.getMetrics()` в формате Prometheus exposition.
