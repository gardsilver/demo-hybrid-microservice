# Common Module

## Описание

Содержит описания и реализации часто используемого общего функционала уровня 1 (core). Не является глобальным `DynamicModule` — экспортирует набор классов, утилит и типов, которые используются напрямую через `import`.

### Common Formatters Module

Лог-форматеры, не вошедшие в `ElkLogger Module` (**@see** `src/modules/common/formatters`). На текущий момент содержит только `BufferObjectFormatter`.

### Базовые типы

- `IHeaders` - нормализованный тип заголовков. К нему будут приведены все форматы заголовков (`http`, `gRPC` metadata, `Kafka` и др.).
- `IKeyValue<T = unknown>` - общий тип объектов. К нему будут приведены все неизвестные экземпляры классов, объектов и др структур.
- `LoggerMarkers` - enum часто используемых маркеров при формировании логов.
- `IGeneralAsyncContext` и `GeneralAsyncContext` - Базовый асинхронный контекст, расширяет `IAsyncContext` и `Partial<ITraceSpan>` полями `requestId`, `correlationId`, `traceId`, `spanId` и т.д.

### Базовые интерфейсы сервисов

- `IFormatter<From, To>` - общий интерфейс класса реализующего преобразование `From` к `To`.
- `IHeadersToContextAdapter<Ctx = IAsyncContext>` - общий интерфейс адаптера реализующего преобразование полученных заголовков из запроса к формату используемого асинхронного контекста `IAsyncContext`.

### Динамические модули

- `ImportsType` - синоним для `ModuleMetadata['imports']` (`@nestjs/common`).
- `IServiceClassProvider<T>` - Упрощенный интерфейс `ClassProvider` (`@nestjs/common`).
- `IServiceValueProvider<T>` - Упрощенный интерфейс `ValueProvider` (`@nestjs/common`).
- `IServiceFactoryProvider<T>` - Упрощенный интерфейс `FactoryProvider` (`@nestjs/common`).
- `ProviderBuilder.build(token, options)` - возвращает `Provider` (`@nestjs/common`), автоматически выбирая между `useClass` / `useValue` / `useFactory`.
- `MetadataExplorer` - Сервис реализующий поиск `providers` по всем зарегистрированным `providers` в `NestApplication`, у которых имеются привязанные метаданные к методу с заданным `metadataKey`. Может быть полезен, когда реализуется декоратор фиксирующий метод сервиса, который в последствии нужно будет вызвать третьему лицу. (**@see** `GracefulShutdownOnEvent` (`src/modules/graceful-shutdown`))

### ВАЖНО

 При подключении `MetadataExplorer` нужно импортировать `DiscoveryModule` (`@nestjs/core`).

### `BaseHeadersHelper`

  Базовый `Helper` при работе с заголовками разных типов.

- `normalize` - приводит заголовки (`http`, `gRPC`, `Kafka` и тд.) к нормализованному `IHeaders` виду.
- `searchValue` - ищет по именам заголовков значение. Вернет первое найденное.

### `ConfigServiceHelper`

  Реализует часто используемый функционал для валидации и преобразования параметров окружений к нужному типу данных.

- `ConfigServiceHelper.getKeyName` возвращает полное имя параметра окружения.
- `ConfigServiceHelper.error` выбрасывает ошибку валидации.
- `ConfigServiceHelper.parseBoolean` возвращает как `boolean`, если задано **yes** или **no**.
- `ConfigServiceHelper.parseInt` приводит к целому числу.
- `ConfigServiceHelper.parseArray` приводит к `Array<string>`.

### `ExceptionHelper`

- `stackFormat` - приводит `stack` к массиву.

### `UrlHelper`

- `normalize` - приводит `http://host:port/path` к виду `host:port`.
- `parse` - извлекает  `hostname` и `pathname`, при этом в `hostname` схема опускается и содержит порт.

### `SkipInterceptors`

Декоратор класса/метода, указывающий о необходимости отключения одного или нескольких глобально настроенных интерцепторов/гуардов. Принимает список ссылок на классы интерцепторов/гуардов либо sentinel-значение `SKIP_ALL`.

- `@SkipInterceptors(HttpAuthGuard, HttpLogging)` — отключить перечисленные.
- `@SkipInterceptors(SKIP_ALL)` — отключить все глобальные guard'ы/interceptor'ы, использующие `isSkipped`.
- Декоратор на методе **дополняет** список, заданный на уровне класса (метаданные сливаются).

### `KeepInterceptors`

Обратный декоратор: убирает указанные классы из итогового списка skip'а (полезен, когда на классе стоит широкий skip, а для конкретного метода нужно вернуть отдельный guard/interceptor). Перевешивает `SKIP_ALL`.

```ts
@SkipInterceptors(SKIP_ALL)
@Controller('internal')
class InternalController {
  @Get('me')
  @KeepInterceptors(HttpAuthGuard) // для этого метода авторизация всё-таки выполняется
  me() {}
}
```

### `isSkipped`

Функция, определяющая, нужно ли пропустить конкретный guard/interceptor для текущего `ExecutionContext`. Учитывает оба декоратора и `SKIP_ALL`. Используется внутри guard/interceptor-классов.

### `Circular normalizers`

Данный набор функций призван удалять циклические ссылки в сложных объектах. Не приводит к мутации данных основного объекта - вы получите полную копию вашего объекта, но с удаленными циклическими ссылками.

- `AbstractCheckObject`  Абстрактный класс, реализующий интерфейс `isInstanceOf(obj: object): boolean`, призван определить соответствует ли переданный объект вашему типу/интерфейсу/классу в том случае, если стандартные оператор **instanceof** не применим и необходимо реализовать свою логику.

- `isObjectInstanceOf` - функция, проверяющая на соответствие переданного объекта указанным типам/интерфейсам/классам.

- `circularReplacerBuilder` -  Возвращает функцию для `JSON.stringify()`, которая перед построением **json-строки**  удалит из него циклически ссылки. В опциях можно задать способ удаления/подмены циклической ссылки.

- `circularRemove` - функция, создает точную копию переданного объекта, но с удаленными циклическими ссылками. В опциях можно задать способ удаления/подмены циклической ссылки. А так же настроить исключения на базе `isObjectInstanceOf`, которые не будут анализироваться.

## `Normalizers`

- `moneyToKopecks` возвращает сумму указанную в `google.type.Money` в копейках.
- `objToJsonString` быстрый метод приведения объекта к **json-строки**. Может быть полезен при отладке, когда нужно быстро привести неизвестный объект к человеко читаемому виду в логе. Данный метод выводит подробную информацию об объекте, что в большинстве случаев излишне. Не рекомендуется ее применять в конечных решениях.
- `isStaticMethod` проверяет, является ли метод статическим.
- `enumKeys` - возвращает имена ключей **enum**
- `enumValues` - возвращает значения **enum**

## Параметры окружения

Модуль сам по себе не читает переменные окружения. `ConfigServiceHelper` — лишь утилита, которую используют другие модули при чтении собственных настроек через `@nestjs/config`.

## Примеры использования

### Регистрация провайдера через `ProviderBuilder`

```ts
import { Module } from '@nestjs/common';
import { ProviderBuilder } from 'src/modules/common';

export const MY_SERVICE_DI = Symbol('MY_SERVICE_DI');

@Module({
  providers: [
    ProviderBuilder.build(MY_SERVICE_DI, { useClass: MyServiceImpl }),
  ],
  exports: [MY_SERVICE_DI],
})
export class MyModule {}
```

### Использование `GeneralAsyncContext` в сервисе

```ts
import { Injectable } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common';

@Injectable()
export class OrderService {
  public async handle(): Promise<void> {
    const requestId = GeneralAsyncContext.instance.get('requestId');
    const ctx = GeneralAsyncContext.instance.extend();
    // ...
  }
}
```

### Чтение переменной окружения через `ConfigServiceHelper`

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';

@Injectable()
export class MyConfig {
  private readonly helper: ConfigServiceHelper;

  constructor(configService: ConfigService) {
    this.helper = new ConfigServiceHelper('MY_MODULE', configService);
  }

  public getTimeoutMs(): number {
    return this.helper.parseInt('TIMEOUT_MS', { defaultValue: 5000, min: 1 });
  }
}
```

### Отключение глобального interceptor'а через `SkipInterceptors`

```ts
import { Controller, Get } from '@nestjs/common';
import { SKIP_ALL, SkipInterceptors, KeepInterceptors } from 'src/modules/common';
import { HttpAuthGuard, HttpLogging } from 'src/modules/http/http-server';

// Отключить HttpAuthGuard для конкретного метода
@Controller('public')
export class PublicController {
  @Get('ping')
  @SkipInterceptors(HttpAuthGuard)
  public ping(): string {
    return 'pong';
  }
}

// Широкое отключение на классе + точечная отмена на методе
@Controller('internal')
@SkipInterceptors(SKIP_ALL)
export class InternalController {
  @Get('me')
  @KeepInterceptors(HttpAuthGuard) // для этого метода авторизация всё-таки нужна
  public me() {}
}
```

Внутри своих `Guard` / `Interceptor` проверка выполняется через `isSkipped`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isSkipped } from 'src/modules/common';

@Injectable()
export class HttpAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    if (isSkipped(context, this.reflector, HttpAuthGuard)) {
      return true;
    }
    // ...основная логика проверки авторизации
    return true;
  }
}
```
