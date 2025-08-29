# Common Module

## Описание
Содержит описания и реализации часто используемого общего функционала.

### Базовые типы
  `IHeaders` - нормализованный тип заголовков. К нему будут приведены все форматы заголовков (http, gRPC metadata, Kafka и др.).

  `IKeyValue<T = unknown>` - общий тип объектов. К нему будут приведены все неизвестные экземпляры классов, объектов и др структур.

  `LoggerMarkers` - enum часто используемых маркеров при формировании логов.

  `IGeneralAsyncContext` и `GeneralAsyncContext` - Базовый асинхронный контекст.

### Базовые интерфейсы сервисов
  `IFormatter<From, To>` - общий интерфейс класса реализующего преобразование `From` к `To`.

  `IHeadersToContextAdapter<Ctx = IAsyncContext>` - общий интерфейс адаптера реализующего преобразование полученных заголовков из запроса к формату используемого асинхронного контекста `IAsyncContext`.

### Динамические модули.
  `ImportsType` - синоним для `ModuleMetadata['imports']` (`@nestjs/common`).
  `ServiceClassProvider<T>` - Упрощенный интерфейс `ClassProvider` (`@nestjs/common`).
  `ServiceValueProvider<T>` - Упрощенный интерфейс `ValueProvider` (`@nestjs/common`).
  `ServiceFactoryProvider<T>` - Упрощенный интерфейс `FactoryProvider` (`@nestjs/common`).
  `ProviderBuilder.build` - возвращает `Provider` (`@nestjs/common`);
  `MetadataExplorer` - Сервис реализующий поиск `providers` по всем зарегистрированным `providers` в `NestApplication`, у которых имеются привязанные метаданные к методу с заданным `metadataKey`. Может быть полезен, когда реализуется декоратор фиксирующий метод сервиса, который в последствии нужно будет вызвать третьему лицу. (`@see` `GracefulShutdownOnEvent` (`src/modules/graceful-shutdown`))

 ### ВАЖНО
 При подключении `MetadataExplorer` нужно будет импортировать `DiscoveryModule` (`@nestjs/core`).

### `BaseHeadersHelper`
  Базовый Helper при работе с заголовками разных типов.

  `normalize` - приводит заголовки (http, gRPC, Kafka и тд.) к нормализованному `IHeaders` виду.
  
  `searchValue` - ищет по именам заголовков значение. Вернет первое найденное.

### `ConfigServiceHelper`
  Реализует часто используемый функционал для валидации и преобразования параметров окружений к нужному типу данных.
  - `ConfigServiceHelper.getKeyName` возвращает полное имя параметра окружения.
  - `ConfigServiceHelper.error` выбрасывает ошибку валидации.
  - `ConfigServiceHelper.parseBoolean` возвращает как `boolean`, если задано **yes** или **no**.
  - `ConfigServiceHelper.parseInt` приводит к целому числу.
  - `ConfigServiceHelper.parseArray` приводит к `Array<string>`.

### `ExceptionHelper`
  `stackFormat` - приводит stack к массиву.

### `UrlHelper`
  `normalize` - приводит `http://host:port/path` к виду `host:port`.
  `parse` - извлекает  `hostname` и `pathname`, при этом в `hostname` схема опускается и содержит порт.

### `SkipInterceptors`
  Декоратор класса/метода, указывающий о необходимости отключения одного из глобального настроенного интерцептора/гуарда.

### `getSkipInterceptors`
  Функция извлекающая настройки, примененные к классу/методу декоратором `SkipInterceptors`.

### `Circular normalizers`
Данный набор функций призван удалять циклические ссылки в сложных объектах. Не приводит к мутации данных основного объекта - вы получите полную копию вашего объекта, но с удаленными циклическими ссылками.

`AbstractCheckObject`  - абстрактный класс, реализующий интерфейс `isInstanceOf(obj: object): boolean`, призван определить соответствует ли переданный объект вашему типу/интерфейсу/классу в том случае, если стандартные оператор **instanceof** не применим и необходимо реализовать свою логику.  

`isObjectInstanceOf` - функция, проверяющая на соответствие переданного объекта указанным типам/интерфейсам/классам.

`circularReplacerBuilder` -  Возвращает функцию для `JSON.stringify()`, которая перед построением **json-строки**  удалит из него циклически ссылки. В опциях можно задать способ удаления/подмены циклической ссылки.

`circularRemove` - функция, создает точную копию переданного объекта, но с удаленными циклическими ссылками. В опциях можно задать способ удаления/подмены циклической ссылки. А так же настроить исключения на базе `isObjectInstanceOf`, которые не будут анализироваться.

## `Normalizers`

`moneyToKopecks` - возвращает сумму указанную в `google.type.Money` в копейках.

`objToJsonString` - быстрый метод приведения объекта к **json-строки**. Может быть полезен при отладке, когда нужно быстро привести неизвестный объект к человеко читаемому виду в логе. Данный метод выводит подробную информацию об объекте, что в большинстве случаев излишне. Не рекомендуется ее применять в конечных решениях.

`isStaticMethod` - проверяет, является ли метод статическим.

`enumKeys` - возвращает имена ключей **enum**

`enumValues` - возвращает значения **enum**

## Record Formatters

### `GeneralAsyncContextFormatter`
Автоматически дополняет данные логирования информацией из асинхронного контекста.

```typescript
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { GeneralAsyncContextFormatter } from 'src/modules/common';
...

  imports: [
    ...
    ElkLoggerModule.forRoot({
      ...,
      formatters: {
        useFactory: () => {
          return [..., new GeneralAsyncContextFormatter()];
        },
      },
    }),
  ]
...

```
