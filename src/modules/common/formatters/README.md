# Common Formatters Module

## Описание

Лог-форматеры не вошедшие в `ElkLogger Module` (**@see** `src/modules/elk-logger`)

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
      formatters: {
        useFactory: () => {
          return [..., new BufferObjectFormatter()];
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
