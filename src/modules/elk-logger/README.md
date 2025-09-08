# ElkLogger Module

## Описание

Модуль логирования в формате **ElasticSearch**.
Предусмотрены сервисы  `INestElkLoggerService` (**@see** `LoggerService @nestjs/common`) для замены логирования системных логов `NestApplication` и более удобный сервис логирования бизнес-процессов `IElkLoggerService`

Реализованы базовые форматеры данных логирования к **json-формату** с возможностью контроля конечного объема данных логов, а также различное представление данных в зависимости от настроек окружения.

## Структура лога

```typescript
export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}
export interface ILogRecord  {
  level: LogLevel;
  message: string;
  module: string;
  markers?: string[];
  timestamp: string;
  traceId: string;
  spanId: string;
  initialSpanId: string;
  parentSpanId: null | string;
  businessData?: IKeyValue;
  payload?: IKeyValue;
}
```

`IKeyValue<T = unknown>` - общий тип объектов. К нему будут приведены все неизвестные экземпляры классов, объектов и др структур. (**@see** `src/modules/common`)

## Подключение модуля логирования

В основном модуле необходимо подключить `ElkLoggerModule`, вызвав метод `forRoot`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElkLoggerConfig, ElkLoggerModule } from 'src/modules/elk-logger';

@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    ElkLoggerModule.forRoot({ ... }),
  ],
})
export class AppModule()
```

В метод `forRoot` можно передать опции `IElkLoggerModuleOptions` для тонкой настройки формирования конечной записи лога.

| Параметр `IElkLoggerModuleOptions` | Описание | Примеры |
|-|-|-|
|`imports`| Подключение дополнительных модулей, если providers из них могут быть нужны для inject | |
|`providers`| Включение дополнительных providers, если нужны для inject | |
| `defaultFields` | Позволяет задать базовые значения полей лога, которые всегда буду добавляться к конечной записи лога. | `defaultFields: { index: 'My Application' } as ILogFields` - добавит ко всем логам дополнительное поле `index` |
| `formattersOptions.ignoreObjects` | Массив `Type @nestjs/common` или `AbstractCheckObject src/modules/common` для задания исключений в алгоритме приведения неизвестных объектов к виду `IKeyValue`. <br> По умолчанию в список исключений добавлены `Error`, `DateTimestamp` (**@see** `src/modules/date-timestamp`) и `MomentCheckObject` (**@see** `src/modules/common`)|  |
| `formattersOptions.sortFields` | Массив `string` - имена полей `ILogRecord`. Все поля в конечной записи лога будут отсортированы в указанном порядке |  |
| `formattersOptions.exceptionFormatters` | Массив `IObjectFormatter` - набор пользовательских форматеров для различных типов ошибок. |  |
| `formattersOptions.objectFormatters` | Массив `IObjectFormatter` - набор пользовательских форматеров для различных объектов  |
| `formatters` | Задает массив дополнительных форматеров для `ILogRecord` которые будут применены перед формированием конечной записи лога. <br> По умолчанию включены следующие форматеры: `CircularFormatter`, `ObjectFormatter`, `PruneFormatter`, `SortFieldsFormatter`. |  |
| `encoders` | Задает массив дополнительных форматеров, которые будут применены после приведения `ILogRecord` к  **json-строке**. <br> По умолчанию включены следующие форматеры: `PruneEncoder`. |  |

После инициализации модуля `ElkLoggerModule` вам будут доступны следующие сервисы:

| `provide` | Описание |
|-|-|
|`ElkLoggerConfig`| Параметры конфигурации модуля логирования, полученные из параметров окружения `env`|
|`PruneConfig`| Параметры удаления данных из конечной записи лога, с целью уменьшения конечного объема записи лога. Так же формируются на основе параметров окружения `env`|
|`ELK_LOGGER_SERVICE_DI`|  Экземпляр основного сервиса логирования, реализующий интерфейс `IElkLoggerService`. |
|`ELK_NEST_LOGGER_SERVICE_DI`|  Экземпляр сервиса логирования, реализующий интерфейс `LoggerService @nestjs/common`. |
|`ELK_LOGGER_SERVICE_BUILDER_DI`|  Экземпляр сервиса, реализующего интерфейс `IElkLoggerServiceBuilder`. Предназначен для создания пользовательских сервисов `IElkLoggerService`. |

## Параметры окружения

### Базовые - `ElkLoggerConfig`

| Параметры окружения (**env**)| Обязательный| возможные значения | Описание|
|---|---|---|---|
|`LOGGER_FORMAT_RECORD`| нет. По умолчанию: **FULL** |  1. **FULL** - полный лог в формате json `@see FullFormatter` <br> 2. **SIMPLE** - сжатый лог `@see SimpleFormatter` <br> 3. **SHORT** -  максимально сжатый лог `@see SortFieldsFormatter` <br> 4.  **NULL** - не выводить логи.| Определяет формат вывода лога . <br> При указании **FULL** конечная запись лога будет соответствовать **json-строке**. В остальных случаях будет сформирована запись в удобном для восприятия виде. Полезно при локальной разработке.  |
|`LOGGER_IGNORE_MODULES`| нет.| Строка. Регистр имеет значение.  | Через разделитель **','** указываются список значений `ILogRecord.module`, которые будут проигнорированы. Конечная запись лога не будет записана. |
|`LOGGER_LEVELS`| нет.| Регистр не имеет значение. <br> 1. **TRACE** <br> 2. **DEBUG**  <br> 3. **INFO**  <br> 4.  **WARN**  | Через разделитель **','** указываются уровни логирования, которые следует писать. Если не указан, то будут писаться все логи. |
|`LOGGER_FORMAT_TIMESTAMP`| нет. По умолчанию: **'YYYY-MM-DDTHH:mm:ssZ'** | Строка. Регистр имеет значение. | Определяет формат вывода поля `ILogRecord.timestamp` (`@see src/modules/date-timestamp/types/constants.ts`). <br> Если не указан будет использован формат **'YYYY-MM-DDTHH:mm:ssZ'** - **'2022-01-16T20:08:24+03:00'** |
|`LOGGER_STORE_FILE`| нет.| Строка. Регистр имеет значение. | Задает путь к файлу, в который будет писаться полный лог. Будет использован только, если `LOGGER_FORMAT_RECORD=SHORT`. <br> Пример: `LOGGER_STORE_FILE=log.log` |

### Параметры сжатия - `PruneConfig` (`@see PruneFormatter`)

| Параметры окружения (**env**)| Обязательный| возможные значения | Описание|
|---|---|---|---|
| `LOGGER_PRUNE_ENABLED`| нет. По умолчанию: **NO**  |  1. **NO**  (Регистронезависимый) Не применяется <br> 2. **YES** (Регистронезависимый) Лог будет обрезан до длины **--default--** из настройки `LOGGER_PRUNE_MAX_LENGTH_FIELDS`  <br> 3. Любое другое значение (регистр имеет значение) будет интерпретировано, как имя поля из настройки `LOGGER_PRUNE_MAX_LENGTH_FIELDS`, для определения длины обрезания лога.   | |
| `LOGGER_PRUNE_MAX_FIELDS`| нет. По умолчанию: **0** |  Число.   | Определяет максимальное кол-во полей в `ILogRecord.businessData` / `ILogRecord.payload`.  Значение **0** отключает проверку. |
| `LOGGER_PRUNE_MAX_DEPTH`| нет. По умолчанию: **0** |  Число.   | Определяет максимальную длину вложенности данных в `ILogRecord.businessData` / `ILogRecord.payload`.  Значение **0** отключает проверку. |
| `LOGGER_PRUNE_APPLY_FOR_FORMATS`| нет. |  Строка. Через разделитель **','** указывается для какого форматера применять `PruneFormatter`. `@see LOGGER_FORMAT_RECORD`  | Например: `LOGGER_PRUNE_APPLY_FOR_FORMATS=FULL,SHORT` |
| `LOGGER_PRUNE_MAX_LENGTH_FIELDS`| нет. |  Строка. Через разделитель **','** указывается пара (через разделитель **'='**): **имя_поля=число** (до какой длины обрезать данное поле)  | Применяется для строк и массивов. Возможно указание глобальных лимитов. Значения 0 или меньше - отключает применение для указанного поля. <br> Пример: `LOGGER_PRUNE_MAX_LENGTH_FIELDS=--array--=2,--default--=40,fileBody=20`. Здесь **--array--** и **--default--** - служебные значения для указания ограничения длины по умолчанию для массивов и общего ограничения.|

## `INestElkLoggerService`

Данный сервис логирования предназначен для замены основного сервиса логирования `NestApplication` и реализует интерфейс `LoggerService @nestjs/common`.

Создание этого сервиса и замещение основного сервиса логирования `NestApplication` подразумевает два этапа.

1. Создание экземпляра `INestElkLoggerService` до вызова `NestFactory.create`, что бы иметь возможность писать логи, даже если `NestFactory.create` выкинет ошибку и не сможет создать экземпляр приложения. Для этого нужно использовать `NestElkLoggerServiceBuilder` (`@see` **main.ts** функция `bootstrap`):

```typescript
import {
  NestElkLoggerServiceBuilder,
} from 'src/modules/elk-logger';

...
    let nestLogger = NestElkLoggerServiceBuilder.build({ ... });

    const app = await NestFactory.create<NestExpressApplication>(MainModule, { logger: nestLogger, bufferLogs: true });
...
```

Метод `NestElkLoggerServiceBuilder.build` принимает те же настройки, что и метод `ElkLoggerModule.forRoot` и еще экземпляр `ConfigService`.

2. После создания экземпляра приложения, задать основной сервис логирования

```typescript
import {
  ELK_NEST_LOGGER_SERVICE_DI,
} from 'src/modules/elk-logger';

...
  nestLogger = app.get(ELK_NEST_LOGGER_SERVICE_DI);
  app.useLogger(nestLogger);
  app.flushLogs();
...
```

## `IElkLoggerService`

Сервис логирования.

Необходимо использовать `IElkLoggerServiceBuilder` для получения экземпляра данного сервиса.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';

@Injectable()
export class AppService {
    constructor(
        @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
        private readonly loggerBuilder: IElkLoggerServiceBuilder,
    );


    run(): void {
        const logger = this.loggerBuilder..build({ ... });

        logger.info('Call run!', {...});
    }
}
```

Метод `IElkLoggerServiceBuilder.build` позволяет задать базовые значения полей лога, которые всегда будут добавляться сервисом `logger` к конечной записи лога. Они будут объединены с `defaultFields` (которые задаются через `ElkLoggerModule.forRoot`) и с `IOptionLog` (которые передаются в момент вызова метода логирования сервиса `logger`).

## Дополнительные возможности

### `TraceSpanHelper`

Определяет набор базовых операций с параметрами сквозного логирования: `generateRandomValue`, `toZipkinFormat`, `toGuidFormat`, `formatToZipkin`, `formatToGuid`

### `TraceSpanBuilder`

Позволяет создать параметры сквозного логирования: `build`

## Record Formatters `IFormatter<ILogRecord, ILogRecord>`

### `CircularFormatter`

Выполняется самым первым: удаляет из `ILogRecord.businessData` и `ILogRecord.payload` циклические ссылки, нормализует данные приводя к виду `IKeyValue` (`@see src/modules/common`).

### `ObjectFormatter`

Применяется сразу после `CircularFormatter`. Преобразует различные экземпляры объектов к человеко читаемому виду. По умолчанию он включает в себя базовый форматер для объектов класса `Error` (`ExceptionObjectFormatter`). Подключать пользовательские форматеры, которые будет использовать  `ObjectFormatter`, можно указав соответствующие настройки при подключения модуля (**@see** `formattersOptions.exceptionFormatters` и  `formattersOptions.objectFormatters`)

### `PruneFormatter`

Применяется предпоследним. Сразу после того как отработают все пользовательские форматеры. Обрезает данные логирования согласно настройкам `PruneConfig`.

### `SortFieldsFormatter`

Применяется последним, до того как данные лога `ILogRecord` будут преобразованы в `string` одним из форматеров `LOGGER_FORMAT_RECORD`.

## Record Encodes `IFormatter<ILogRecord, string>`

`@see LOGGER_FORMAT_RECORD`.

### `FullFormatter`

Преобразует данные лога к валидной **json-строке**.

### `SimpleFormatter`

Преобразует данные лога к отформатированной строке, применяя цветовую схему в зависимости от уровня лога `LogLevel`.

### `ShortFormatter`

Преобразует данные лога к отформатированной строке, применяя цветовую схему в зависимости от уровня лога `LogLevel`. Выводит сильно меньше информации, по сравнению с `SimpleFormatter`.

### `FileFormatter`

Преобразует данные лога для записи в файл.

## Encoders `IFormatter<string, string>`

Обрабатывают данные логирования преобразованные в строку. По сути являются форматерами пост-обработки. Например, можно реализовать форматер для удаления лишних пробелов и т.п.

### ВНИМАНИЕ

При написании собственных `encoders` будьте предельно аккуратны, так как на выходе можете получить не валидную **json-строку**.

### `PruneEncoder`

Если логи в формате `SHORT` окажутся по прежнему довольно большими, то этот форматер сделает их еще меньше насильно обрезая до **--default--** или длины поля указанного в `LOGGER_PRUNE_ENABLED`.
