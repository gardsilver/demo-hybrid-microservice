# Async Context

## Описание

Позволяет хранить данные на протяжении всего жизненного цикла любой асинхронной операции.
[@see node:async_hooks](https://nodejs.org/api/async_context.html#class-asynclocalstorage)

### Как применять

#### 1. Опишите свой асинхронный контекст

```typescript
import { IAsyncContext, AbstractAsyncContext } from 'src/modules/async-context';

export interface IMyAsyncContext extends IAsyncContext {
  requestId: string;
  correlationId: string;
}

export class MyAsyncContext extends AbstractAsyncContext<IMyAsyncContext> {
  public static instance = new MyAsyncContext();
}

```

#### 2. Перед выполнением асинхронной операции нужно создать асинхронный контекст. Это можно сделать двумя способами

##### 2.1. Через декоратор

```typescript
import { randomUUID } from 'crypto';

export class MyService {

  /** Обратите внимание, что здесь аргументы request и correlation будут соответствовать аргументам метода: req и cor.
  */
  @MyAsyncContext.define((request, correlation) => ({
    requestId: request,
    correlationId: correlation,
  }))
  async asyncMethod(req: string, cor: string,): Promise<string> {
    return 'Hello World!';
  }

  @MyAsyncContext.define(() => ({
    requestId: randomUUID(),
    correlationId: randomUUID(),
  }))
  noAsyncMethod(): string {
    return 'Hello World!';
  }


  async asyncOtherMethod(message: string): Promise<string> {
    return message;
  }

}
```

##### 2.1. Через вызов методов `runWithContext`/`runWithContextAsync`

```typescript
   MyAsyncContext.instance.runWithContextAsync(
      async () => { return service.asyncOtherMethod('Hello World!') },
      {
        requestId: randomUUID(),
        correlationId: randomUUID(),
      }
   )
```

#### 3. Созданный контекст будет доступен в любом месте цепочки асинхронных вызовов

Для этого служат методы `get`, `getSafe` и `extend`:

```typescript
export class MyService {
  constructor(private readonly service: RunService) {}

  @MyAsyncContext.define(() => ({
    requestId: randomUUID(),
    correlationId: randomUUID(),
  }))
  async anyMethod(message: string): Promise<string> {
    return await this.service.run(message);
  }
}


export class RunService {
  async run(message: string): Promise<string> {
    const requestId = MyAsyncContext.instance.get('requestId');
    const context = MyAsyncContext.instance.extend();

    return message;
  }
}
```

#### 4. Созданный контекст можно дополнять или изменять

```typescript
export class RunService {
  async run(message: string): Promise<string> {
    MyAsyncContext.instance.set('requestId', 'request');
    MyAsyncContext.instance.setMultiple({
        correlationId:  'correlationId',
    });

    return message;
  }
}
```

## ВАЖНО

Декоратор метода `AbstractAsyncContext.define` переопределяет декорируемый метод. Если вы применяет этот декоратор в сочетании с другими декораторами, активно использующие метаданные, то могут быть скрытые ошибки из-за потери метаданных последними.
При возникновении подобной проблемы помогает:

- смена порядка применения декораторов
- или применение конфликтующих декораторов на разные методы.
- или использовать `runWithContext()`
