# ElkLogger Module

## Описание

Модуль логирования в формате **ElasticSearch**. Предоставляет два основных сервиса:

- `INestElkLoggerService` — замена штатного `LoggerService` из `@nestjs/common` для системных логов `NestApplication`;
- `IElkLoggerService` — удобный сервис логирования бизнес-процессов с поддержкой сквозного контекста (`traceId`/`spanId`).

Реализован конвейер форматеров, позволяющий контролировать объём и представление конечной записи лога, а также гибко расширять обработку пользовательскими типами.

## Структура лога

```ts
export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface ILogRecord {
  level: LogLevel;
  message: string;
  module: string;
  markers?: string[];
  timestamp: string;
  traceId: string;
  spanId: string;
  initialSpanId: string;
  parentSpanId: string | undefined;
  businessData?: IKeyValue;
  payload?: IKeyValue;
}
```

`IKeyValue<T = unknown>` — общий тип объектов, к которому приводятся все неизвестные экземпляры классов и структур (**@see** `src/modules/common`).

## Публичное API

| Export | Тип | Назначение |
|---|---|---|
| `ElkLoggerModule.forRoot(options?)` | `DynamicModule` | Регистрация модуля глобально (`global: true`). |
| `ELK_LOGGER_SERVICE_DI` | `Symbol` | Основной `IElkLoggerService`. |
| `ELK_NEST_LOGGER_SERVICE_DI` | `Symbol` | `INestElkLoggerService` — адаптер для `app.useLogger()`. |
| `ELK_LOGGER_SERVICE_BUILDER_DI` | `Symbol` | `IElkLoggerServiceBuilder` — фабрика логеров с дополнительными `defaultFields`. |
| `ElkLoggerConfig` | `class` | Конфигурация из env. |
| `PruneConfig` | `class` | Конфигурация сжатия логов. |
| `@ElkLoggerOnService` / `@ElkLoggerOnMethod` | декораторы | Автоматическое логирование вызова методов. |
| `NestElkLoggerServiceBuilder` | `class` | Создание `INestElkLoggerService` до `NestFactory.create`. |
| `TraceSpanHelper`, `TraceSpanBuilder` | утилиты | Работа с `traceId` / `spanId` (Zipkin / GUID). |
| `BaseObjectFormatter`, `BaseErrorObjectFormatter` | абстрактные классы | Базовые классы для пользовательских `IObjectFormatter`. |
| `GeneralAsyncContextFormatter` | `class` | Встроенный `ILogRecordFormatter`, подключается модулем по умолчанию и дополняет запись `traceId`/`spanId`/`initialSpanId`/`parentSpanId` из `GeneralAsyncContext`, а при их отсутствии — из `ProcessTraceSpanStore`. |
| `ProcessTraceSpanStore` | `class` (singleton) | Стабильный fallback trace/span на весь процесс для логов, возникших вне async-контекста. |

## Подключение модуля

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerModule } from 'src/modules/elk-logger';

@Module({
  imports: [
    ConfigModule.forRoot({ /* ... */ }),
    ElkLoggerModule.forRoot({
      defaultFields: { module: 'MyApp' },
      formattersOptions: {
        sortFields: ['timestamp', 'level', 'module', 'message'],
      },
    }),
  ],
})
export class MainModule {}
```

### Опции `IElkLoggerModuleOptions`

`ElkLoggerModule.forRoot(options?: IElkLoggerModuleOptions)` — все поля опциональны; при вызове без аргументов используются только настройки из env (`ElkLoggerConfig`, `PruneConfig`) и стандартный набор форматеров.

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `imports` | `ImportsType` | нет | `[]` | Дополнительные модули для DI-зависимостей, передаваемых в `providers` / `useFactory`. |
| `providers` | `Provider[]` | нет | `[]` | Дополнительные провайдеры, доступные внутри модуля. |
| `defaultFields` | `ILogFields` | нет | `{}` | Базовые поля, добавляемые ко всем логам (например, `{ index: 'My Application', module: 'MyApp' }`). Мёржатся с `defaultFields` из `IElkLoggerServiceBuilder.build()` и с вызовом логгера. |
| `formattersOptions.ignoreObjects` | `IServiceClassProvider<CheckObjectsType[]>` \| `IServiceValueProvider<CheckObjectsType[]>` \| `IServiceFactoryProvider<CheckObjectsType[]>` | нет | `[Error, DateTimestamp, MomentCheckObject]` | Массив типов, исключаемых `CircularFormatter` из преобразования к `IKeyValue`. Пользовательский список добавляется к дефолтному. |
| `formattersOptions.sortFields` | `string[]` | нет | `undefined` (порядок не задан) | Имена полей `ILogRecord` в нужном порядке вывода. Используется `SortFieldsFormatter`. |
| `formattersOptions.exceptionFormatters` | `IServiceClassProvider<BaseErrorObjectFormatter[]>` \| `IServiceValueProvider<BaseErrorObjectFormatter[]>` \| `IServiceFactoryProvider<BaseErrorObjectFormatter[]>` | нет | Только встроенный `ErrorObjectFormatter` | Пользовательские форматеры ошибок (наследники `BaseErrorObjectFormatter`). |
| `formattersOptions.objectFormatters` | `IServiceClassProvider<BaseObjectFormatter[]>` \| `IServiceValueProvider<BaseObjectFormatter[]>` \| `IServiceFactoryProvider<BaseObjectFormatter[]>` | нет | `[]` | Пользовательские форматеры объектов (наследники `BaseObjectFormatter`). |
| `formatters` | `IServiceClassProvider<ILogRecordFormatter[]>` \| `IServiceValueProvider<ILogRecordFormatter[]>` \| `IServiceFactoryProvider<ILogRecordFormatter[]>` | нет | `[]` | Дополнительные `ILogRecord → ILogRecord` форматеры, выполняемые между `ObjectFormatter` и `PruneFormatter`. Порядок задаётся `priority()`. |
| `encoders` | `IServiceClassProvider<IEncodeFormatter[]>` \| `IServiceValueProvider<IEncodeFormatter[]>` \| `IServiceFactoryProvider<IEncodeFormatter[]>` | нет | `[]` | Дополнительные `string → string` форматеры пост-обработки, выполняемые после основного `Encoder` и перед `PruneEncoder`. Порядок задаётся `priority()`. |

Все параметры с `IServiceProvider<T>` совместимы с `useClass` / `useValue` / `useFactory` через `ProviderBuilder.build`.

## Параметры окружения

### Базовые — `ElkLoggerConfig`

| Переменная | Тип | По умолчанию | Значения | Описание |
|---|---|---|---|---|
| `LOGGER_FORMAT_RECORD` | string | `FULL` | `FULL` / `SIMPLE` / `SHORT` / `NULL` | Формат конечной записи лога. `FULL` — валидный JSON (для production / ElasticSearch). `SIMPLE` и `SHORT` — человекочитаемые варианты с цветами, `NULL` — отключает вывод. |
| `LOGGER_IGNORE_MODULES` | string (CSV) | — | Имена модулей с учётом регистра | Список `ILogRecord.module`, для которых лог полностью подавляется. |
| `LOGGER_LEVELS` | string (CSV) | — | `TRACE`, `DEBUG`, `INFO`, `WARN` (регистр не важен) | Уровни, которые следует писать. Если пусто — пишутся все. |
| `LOGGER_FORMAT_TIMESTAMP` | string | `DATE_BASE_FORMAT` (`YYYY-MM-DD[T]HH:mm:ssZ`) | Шаблон moment.js | Формат `ILogRecord.timestamp` (**@see** `src/modules/date-timestamp`). |
| `LOGGER_STORE_FILE` | string | — | Путь к файлу | Путь записи лога в файл. Применяется только при `LOGGER_FORMAT_RECORD=SHORT`. |

### Сжатие — `PruneConfig` (**@see** `PruneFormatter`)

| Переменная | Тип | По умолчанию | Значения | Описание |
|---|---|---|---|---|
| `LOGGER_PRUNE_ENABLED` | string | `NO` | `NO` / `YES` / `<имя_поля>` | `NO` — не применять. `YES` — обрезать до длины `--default--` из `LOGGER_PRUNE_MAX_LENGTH_FIELDS`. Любое другое значение трактуется как имя поля из `LOGGER_PRUNE_MAX_LENGTH_FIELDS`. |
| `LOGGER_PRUNE_MAX_FIELDS` | number | `0` | `0` — без ограничений | Максимальное количество полей в `businessData` / `payload`. |
| `LOGGER_PRUNE_MAX_DEPTH` | number | `0` | `0` — без ограничений | Максимальная глубина вложенности в `businessData` / `payload`. |
| `LOGGER_PRUNE_APPLY_FOR_FORMATS` | string (CSV) | — | `FULL`, `SIMPLE`, `SHORT`, `NULL` | Форматы, к которым применяется `PruneFormatter`. |
| `LOGGER_PRUNE_MAX_LENGTH_FIELDS` | string (CSV `имя=длина`) | — | Служебные имена `--default--`, `--array--`; `<= 0` отключает лимит | Лимиты длин для строк и массивов. Пример: `--array--=2,--default--=40,fileBody=20`. |

## Pipeline форматеров

Порядок применения при каждом вызове логгера:

```
CircularFormatter → ObjectFormatter → GeneralAsyncContextFormatter
  → [пользовательские ILogRecordFormatter]
  → PruneFormatter → SortFieldsFormatter
  → Encoder (FULL/SIMPLE/SHORT/FILE)
  → [пользовательские IEncodeFormatter] → PruneEncoder → stdout / file
```

### Record Formatters `IFormatter<ILogRecord, ILogRecord>`

| Форматер | Роль |
|---|---|
| `CircularFormatter` | Удаляет циклические ссылки из `businessData`/`payload`, нормализует к `IKeyValue`. Выполняется первым. |
| `ObjectFormatter` | Преобразует экземпляры объектов к читаемому виду. Всегда включает `ErrorObjectFormatter`. Принимает пользовательские `objectFormatters` / `exceptionFormatters`. |
| `GeneralAsyncContextFormatter` | Встроенный форматер. Проставляет `traceId`/`spanId`/`initialSpanId`/`parentSpanId` из `GeneralAsyncContext`, либо из `ProcessTraceSpanStore` (стабильный fallback на процесс). Явная регистрация не требуется. |
| Пользовательские `ILogRecordFormatter` | Регистрируются через опцию `formatters`. У каждого может быть `priority()` для управления порядком. |
| `PruneFormatter` | Обрезает данные по `PruneConfig`. Выполняется предпоследним. |
| `SortFieldsFormatter` | Сортирует поля `ILogRecord` согласно `formattersOptions.sortFields`. |

### Record Encoders `IFormatter<ILogRecord, string>` (выбирается по `LOGGER_FORMAT_RECORD`)

| Encoder | Формат |
|---|---|
| `FullFormatter` | Валидная JSON-строка. |
| `SimpleFormatter` | Читаемая строка с цветовой схемой по `LogLevel`. |
| `ShortFormatter` | Сильно сокращённая цветная строка. |
| `FileFormatter` | Форматированный вывод для записи в файл. |

### String Encoders `IFormatter<string, string>`

| Encoder | Роль |
|---|---|
| Пользовательские `IEncodeFormatter` | Регистрируются через опцию `encoders`, имеют `priority()`. |
| `PruneEncoder` | Дополнительно обрезает уже сформированную строку до длины `--default--` или поля, указанного в `LOGGER_PRUNE_ENABLED`. |

**Внимание**: при написании собственных `encoders` можно легко получить невалидный JSON — будьте аккуратны.

## Пользовательские форматеры объектов

Наследуйтесь от `BaseObjectFormatter` / `BaseErrorObjectFormatter`:

```ts
import { BaseObjectFormatter } from 'src/modules/elk-logger';

class BufferObjectFormatter extends BaseObjectFormatter<Buffer> {
  isInstanceOf(obj: unknown): obj is Buffer {
    return Buffer.isBuffer(obj);
  }

  transform(from: Buffer): unknown {
    return { type: 'Buffer', length: from.length };
  }
}

ElkLoggerModule.forRoot({
  formattersOptions: {
    objectFormatters: { useValue: [new BufferObjectFormatter()] },
  },
});
```

## `INestElkLoggerService`

Замена основного логгера `NestApplication`. Подключается в два этапа (**@see** `src/main.ts`).

```ts
import { NestElkLoggerServiceBuilder, ELK_NEST_LOGGER_SERVICE_DI } from 'src/modules/elk-logger';

async function bootstrap() {
  let nestLogger = NestElkLoggerServiceBuilder.build({ /* те же опции, что forRoot */ });

  const app = await NestFactory.create<NestExpressApplication>(MainModule, {
    logger: nestLogger,
    bufferLogs: true,
  });

  nestLogger = app.get(ELK_NEST_LOGGER_SERVICE_DI);
  app.useLogger(nestLogger);
  app.flushLogs();
}
```

`NestElkLoggerServiceBuilder.build` принимает те же опции, что и `ElkLoggerModule.forRoot`, плюс экземпляр `ConfigService`.

## `IElkLoggerService`

Сервис логирования бизнес-логики. Получается через `IElkLoggerServiceBuilder`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';

@Injectable()
export class AppService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
  ) {}

  run(): void {
    const logger = this.loggerBuilder.build({ module: 'AppService' });

    logger.info('Call run!', { payload: { foo: 'bar' } });
  }
}
```

`defaultFields` из `build()` объединяются с `defaultFields` модуля и с `IOptionLog` вызова.

Уровни логирования: `trace` / `debug` / `info` / `warn` / `error` / `fatal` и общий `log(level, message, data?)`.

## Декораторы `@ElkLoggerOnService` / `@ElkLoggerOnMethod`

Альтернатива прямому вызову логера — автоматическая фиксация `before` / `after` / `throw` вокруг метода:

```ts
import { Injectable } from '@nestjs/common';
import { ElkLoggerOnMethod, ElkLoggerOnService } from 'src/modules/elk-logger';

@ElkLoggerOnService({
  fields: () => ({ module: 'Custom' }),
})
@Injectable()
export class AppService {
  @ElkLoggerOnMethod({
    fields: ({ methodsArgs }) => ({ payload: { args: methodsArgs } }),
    before: false,
    after: ({ result }) => ({
      message: 'AppService.run success',
      data: { payload: { result } },
    }),
    throw: ({ error }) => ({
      message: 'AppService.run failed',
      data: { payload: { error } },
    }),
  })
  run(...args: unknown[]) {
    return /* ... */;
  }
}
```

### Параметры `@ElkLoggerOnService`

Декоратор класса. Задаёт поля по умолчанию (`ILogFields`), которые будут применяться ко всем логам методов класса, задекорированных `@ElkLoggerOnMethod`. Принимает объект `ElkLoggerBuilderOptions`:

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `fields` | `ILogFields \| (() => ILogFields)` | да | Поля лога, общие для класса. Значение или функция-фабрика (вычисляется один раз при применении декоратора). Мёржится с `fields` из `@ElkLoggerOnMethod`. |

### Параметры `@ElkLoggerOnMethod`

Декоратор метода. Принимает объект `IElkLoggerOnMethod` с описанием хуков вокруг вызова метода. Каждый хук (`before` / `after` / `throw` / `finally`) может быть: значением `IElkLoggerParams`, `boolean` (включить/выключить событие с дефолтным payload), либо функцией, принимающей контекст вызова и возвращающей одно из вышеперечисленных.

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `fields` | `ILogFields \| ((opts: { service?, method?, methodsArgs? }) => ILogFields)` | нет | Поля лога на уровне метода. Мёржатся поверх `fields` из `@ElkLoggerOnService`. |
| `before` | `Omit<IElkLoggerParams, 'fields'> \| boolean \| ((opts: { service?, method?, methodsArgs? }) => ...)` | нет | Лог перед вызовом. По умолчанию — дефолтный payload с `args`. `false` отключает. |
| `after` | `Omit<IElkLoggerParams, 'fields'> \| boolean \| ((opts: { service?, method?, result?, duration?, methodsArgs? }) => ...)` | нет | Лог после успешного вызова (для промиса — после `resolve`). `false` отключает. |
| `throw` | `Omit<IElkLoggerParams, 'fields'> \| boolean \| ((opts: { service?, method?, error, duration?, methodsArgs? }) => ...)` | нет | Лог при выбросе исключения (для промиса — при `reject`). `false` отключает. |
| `finally` | `Omit<IElkLoggerParams, 'fields'> \| boolean \| ((opts: { service?, method?, duration?, methodsArgs? }) => ...)` | нет | Лог в блоке `finally`. По умолчанию **не эмитится** (в отличие от остальных хуков — `undefined` трактуется как `false`). |

Поля `IElkLoggerParams` (возвращаемое значение из хуков, кроме `fields`):

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `level` | `LogLevel` | нет | Уровень лога (`trace` / `debug` / `info` / `warn` / `error` / `fatal`). |
| `message` | `string` | нет | Сообщение лога. |
| `data` | `IOptionLog` | нет | Произвольные данные: `payload`, `markers`, `tags`, `error` и т. п. |

## Вспомогательные утилиты

### `TraceSpanHelper`

Набор операций над параметрами сквозного логирования: `generateRandomValue`, `toZipkinFormat`, `toGuidFormat`, `formatToZipkin`, `formatToGuid`.

### `TraceSpanBuilder`

Собирает объект `ITraceSpan` (`traceId`, `spanId`, `initialSpanId`, `parentSpanId`) через метод `build`. Используется адаптерами транспортов (`*HeadersToAsyncContextAdapter`) для извлечения контекста из входящих заголовков.
