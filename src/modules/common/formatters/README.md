# Common Formatters Module

## Описание

Лог-форматеры не вошедшие в `ElkLogger Module` (**@see** `src/modules/elk-logger`). Подключаются в конвейер форматеров через опцию `formattersOptions.objectFormatters` модуля `ElkLoggerModule.forRoot()`.

## Публичное API

- `BufferObjectFormatter` — реализация `BaseObjectFormatter<Buffer>` (форматер объекта, подключается через `formattersOptions.objectFormatters`).

Класс экспортируется из `src/modules/common/formatters`.


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
