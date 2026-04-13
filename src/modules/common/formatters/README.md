# Common Formatters Module

## Описание

Лог-форматеры не вошедшие в `ElkLogger Module` (**@see** `src/modules/elk-logger`). Подключаются в конвейер форматеров через опцию `formatters` модуля `ElkLoggerModule.forRoot()`.

## Публичное API

- `BufferObjectFormatter` — реализация `BaseObjectFormatter<Buffer>` (форматер объекта, подключается через `formattersOptions.objectFormatters`).
- `GeneralAsyncContextFormatter` — реализация `ILogRecordFormatter`, обогащает запись лога данными из `GeneralAsyncContext` (подключается через `formatters`).

Оба класса экспортируются из barrel `src/modules/common/formatters`.

## Параметры окружения

Модуль не читает переменные окружения — форматеры работают с данными, которые передаются в запись лога через контекст.

## Record Formatters

### `BufferObjectFormatter`

Данные типа `Buffer` приводит к типу `string`.

```typescript
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { BufferObjectFormatter } from 'src/modules/common/formatters';
...

  imports: [
    ...
    ElkLoggerModule.forRoot({
      ...,
      formattersOptions: {
        objectFormatters: {
          useFactory: () => {
            return [..., new BufferObjectFormatter()];
          },
        },
      },
    }),
  ]
...

```

### `GeneralAsyncContextFormatter`

Автоматически дополняет данные логирования информацией из асинхронного контекста.

```typescript
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { GeneralAsyncContextFormatter } from 'src/modules/common/formatters';
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
