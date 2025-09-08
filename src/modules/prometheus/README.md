# Prometheus Module

## Описание

Модуль метрик [Prometheus](https://www.npmjs.com/package/prom-client)

Реализована инициализация **PromClient**, авто-регистрация новых метрик и не блокируемая обработка ошибок с фиксацией соответствующих логов.
Безопасно можно сразу писать нужные метрики: `Counter`, `Gauge`, `Histogram`, `Summary`.

## Конфигурация

Через параметры окружения задаются метки, которые будут добавлены ко всем метрикам автоматически:

```typescript
{
  application: string,
  microservice: string,
  version: string,
}
```

| Параметры окружения (**env**)| Обязательный| возможные значения | Описание|
|---|---|---|---|
| `APPLICATION_NAME` | нет  | Тип **string**. Регистр учитывается. | Значение метки **application** |
| `MICROSERVICE_NAME` | нет  | Тип **string**. Регистр учитывается. | Значение метки **microservice** |
| `MICROSERVICE_VERSION` | нет  | Тип **string**. Регистр учитывается. | Значение метки **version** |

## `PrometheusManager`

Предоставляет доступ ко всем метрикам (методы: `counter`, `gauge`, `histogram`, `summary`).

- `getMetrics` - выводит текущие данные по всем метриках
- `getRegistry` - предоставляет прямой доступ к `Registry` (**@see** `prom-client`)
- `getRegistryMetricNames` - выводит список названий всех зарегистрированных метрик.

### Пример подключения

```typescript
import { PrometheusManager } from 'src/modules/prometheus';

...
 constructor(
    ...
    private readonly prometheusManager: PrometheusManager,
    ...
  ) {}
...
```

При необходимости можно подключить нужную метрику.

## `ICounterService`

Сервис метрики `Counter`

### Пример подключения `Counter`

```typescript
import { PROMETHEUS_COUNTER_SERVICE_DI, ICounterService} from 'src/modules/prometheus';

...
 constructor(
    ...
    @Inject(PROMETHEUS_COUNTER_SERVICE_DI),
    private readonly counterService: ICounterService,
    ...
  ) {}
...
```

## `IGaugeService`

Сервис метрики `Gauge`

### Пример подключения `Gauge`

```typescript
import { PROMETHEUS_GAUGE_SERVICE_DI, IGaugeService} from 'src/modules/prometheus';

...
 constructor(
    ...
    @Inject(PROMETHEUS_GAUGE_SERVICE_DI),
    private readonly gaugeService: IGaugeService,
    ...
  ) {}
...
```

## `IHistogramService`

Сервис метрики `Histogram`

### Пример подключения `Histogram`

```typescript
import { PROMETHEUS_HISTOGRAM_SERVICE_DI, IHistogramService} from 'src/modules/prometheus';

...
 constructor(
    ...
    @Inject(PROMETHEUS_HISTOGRAM_SERVICE_DI),
    private readonly gaugeService: IHistogramService,
    ...
  ) {}
...
```

## `ISummaryService`

Сервис метрики `Summary`

### Пример подключения `Summary`

```typescript
import { PROMETHEUS_SUMMARY_SERVICE_DI, ISummaryService} from 'src/modules/prometheus';

...
 constructor(
    ...
    @Inject(PROMETHEUS_SUMMARY_SERVICE_DI),
    private readonly gaugeService: ISummaryService,
    ...
  ) {}
...
```
