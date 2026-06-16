## Модуль WebSocket Телеметрии и Контекста (src/modules/websocket)

Компонент ядра платформы, обеспечивающий сквозную интеграцию протокола WebSockets (Socket.io) с системами распределенной трассировки (OpenTelemetry / Jaeger) и контекстного логирования (ELK / Kibana via AsyncLocalStorage).

## Архитектурные преимущества решения

   1. Zero Deadlocks (Безопасность Event Loop): Модуль полностью автономен. Отказ от глобального авто-инструментирования сокетов на этапе bootstrap() исключает зависание HTTP/2 портов Express/NestJS при старте приложения в изолированных контурах Kubernetes (Air-gapped K8s).
   2. Тотальный мониторинг пайплайна (Pre-Guards Context): Трассировка и контекст памяти разворачиваются на уровне нативного Middleware брокера событий. Любые WS Guards (Гварды авторизации), WS Pipes (Валидация данных) и WS Exception Filters выполняются внутри изолированной области видимости AsyncLocalStorage.
   3. Изоляция от Бизнес-Логики: Инфраструктурный слой вынесен на уровень кастомного сетевого адаптера NestJS. Прикладные разработчики пишут стандартные гейтвеи, не заботясь о пробросе traceId.

------------------------------

## Структура модуля

src/modules/websocket/
├── adapters/
│   └── telemetry-io.adapter.ts          # Кастомный адаптер сокетов с Middleware телеметрии
├── builders/
│   └── ws.microservice.builder.ts       # Изолированный Билдер для инициализации подсистемы
├── decorators/
│   └── ws.event.decorator.ts            # Аналог декоратора `SubscribeMessage` (**@see** `@nestjs/websockets`), но задействует также `WsAuthGuard`
├── filters/
│   └── ws.exceptions.filter.ts          # Фильтер Websocket ошибок
│   └── ws.response.handler.ts           # Обработчик Websocket ошибок, логирует приводит к единому виду.
└── helpers/
│   ├── ws.connection-context.helper.ts  # Хелпер трассировки фазы Handshake (handleConnection)
│   └── ws.helper.ts                     # Реализует проверку контескта на соотвествие Websocket.
│   └── ws.packet.helper.ts              # Безопасный парсер пакетов Socket.io
└── ws.module.ts                         # Модуль `WsModule`, предоставляет доступ к `WsErrorResponseFilter` и к `WsAuthGuard`, подключается глобально.

------------------------------

## Интеграция и запуск

## Шаг 1. Регистрация в bootstrap.ts

Внедрение модуля в сетевой стек приложения выполняется одной строчкой кода через `WsMicroserviceBuilder`. Билдер сам извлечет необходимые DI-компоненты (адаптер HTTP-заголовков) и применит динамические параметры CORS.

```ts
import { INestElkLoggerService } from 'src/modules/elk-logger';
import { AppConfig } from 'src/modules/core/app';
import { WsMicroserviceBuilder } from 'src/modules/modules/websocket';

export async function bootstrap(logger: INestElkLoggerService): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(BootstrapModule, {
    logger,
  });

  // Инициализируем WebSocket телеметрию платформы
  WsMicroserviceBuilder.setup(app, {
    serverOptions: {
      cors: AppConfig.getCorsOptions(),
      connectTimeout: 45000,
    },
  });

  await app.init();
  await app.listen(3000);
  await app.startAllMicroservices();
}
```

## Шаг 2. Использование в Бизнес-Гейтвеях (*.gateway.ts)

Благодаря Middleware-архитектуре, контекст выполнения событий `SubscribeMessage` удерживается асинхронно силами метода `runWithContextAsync(..., 'ws_pipeline_execute')`.

* Для чтения параметров трассировки в любом месте гейтвея или сервиса достаточно вызвать `GeneralAsyncContext.instance.get()`.
* Для безопасного логирования этапа авторизации внутри handleConnection (так как он выполняется вне рамок Middleware) используется утилитарный хелпер `WsConnectionContextHelper`.run.

```ts
import { WebSocketGateway, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common/context';
import { HTTP_SERVER_HEADERS_ADAPTER_DI } from 'src/modules/http/http-server';
import { WsConnectionContextHelper } from 'src/modules/websocket';

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection {
  constructor(
    @Inject(HTTP_SERVER_HEADERS_ADAPTER_DI)
    private readonly headersAdapter: any,
    private readonly logger: MyLoggerService,
  ) {}

  /**
   * Фаза 1: Оборачиваем handshake и проверку логина в контекст
   */
  async handleConnection(client: Socket) {
    return WsConnectionContextHelper.run(client, this.headersAdapter, () => {
      const token = client.handshake.headers['authorization'];
      
      if (!token) {
        // Лог гарантированно напечатается с traceId текущего хэндшейка сокета!
        this.logger.warn('WebSocket connection rejected: Missing token');
        client.disconnect(true);
        return;
      }
      
      this.logger.info(`User successfully connected to socket: ${client.id}`);
    });
  }

  /**
   * Фаза 2: Обработка сообщений. Адаптер уже развернул область памяти!
   */
  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: any) {
    // Вытаскиваем traceId текущего логического события из AsyncLocalStorage одной строчкой
    const activeTraceId = GeneralAsyncContext.instance.get('traceId');
    
    this.logger.info(`Processing 'sendMessage' event inside trace [${activeTraceId}]`, { payload });
    
    // Бизнес-логика отправки...
  }
}
```

------------------------------

## WsEvent

Аналог декоратора `SubscribeMessage`, но дополнительно подключает `WsAuthGuard`

------------------------------

## WsErrorResponseFilter

Обработчик Websocket ошибок. Подключается глобально в модуле `src/modules/hybrid`

------------------------------

## WsAuthGuard

Стандартна проверка авторизации. Из-за особенностей реализации Websocket в `NestJS`, не возможно подключить глобально: используйте либо `UseGuards`, либо `WsEvent`

------------------------------

## Семантика Спанов в Jaeger UI

Для каждого входящего логического события сокета (client.use) модуль порождает спан со следующими спецификациями:

* Имя операции (Operation Name): WS EVENT: [имя_события] (например, WS EVENT: [askMessage]).
* Attributes (Теги):
* messaging.system: rabbitmq / kafka / websocket (для сокетов намертво зафиксировано websocket).
   * messaging.operation: process
   * messaging.destination: [имя_события]
   * websocket.socketId: [уникальный_сессионный_id_клиента]

------------------------------

## Безопасность типов и Линтинг

Компонент полностью удовлетворяет правилам статического анализатора кода ESLint

------------------------------

## 🧪 Юнит-Тестирование

Все компоненты модуля покрыты изолированными тестами на Jest.
