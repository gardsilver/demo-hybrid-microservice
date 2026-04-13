# Auth Module

## Описание

Модуль-заглушка, имитирующий сервис авторизации. Предоставляет:

- `IAuthService` — сервис работы с JWT: создание и валидация токенов.
- `ICertificateService` — сервис получения сертификата/секрета, используемого для подписи и верификации JWT. В поставке идёт `MockCertificateService` — генерирует сертификат на основе `randomUUID()` или использует значение, переданное в опции `useCertificate`.
- `AuthHealthIndicatorService` — health-индикатор готовности (`@nestjs/terminus`): сигнализирует, что сертификат получен и модуль готов обслуживать запросы.

Модуль регистрируется как `global: true`, имеет зависимости уровня 2: `common`, `date-timestamp`, `elk-logger`.

## Публичное API

### DI-токены (`tokens.ts`)

- `AUTH_SERVICE_DI: symbol` — токен `IAuthService`.
- `AUTH_CERTIFICATE_SERVICE_DI: symbol` — токен `ICertificateService`.

### Интерфейсы и типы

- `IAuthService`
  - `synchronized(): boolean` — получен ли сертификат (готовность сервиса).
  - `authenticate(jwtString: string | null): Promise<IAuthInfo>` — валидация JWT, возвращает `IAuthInfo` со статусом и ролями.
  - `getJwtToken(dataToken: IAccessTokenData): string | undefined` — подписывает JWT по текущему сертификату. Возвращает `undefined`, если сертификат ещё не получен.
- `ICertificateService`
  - `getCert(): Promise<string>` — получение сертификата/секрета.
- `IAuthInfo` — `{ status: AuthStatus; roles?: AccessRoles[] }`.
- `IAccessTokenData` — `{ roles?: AccessRoles[] }`.
- `AuthStatus` — enum: `SUCCESS`, `TOKEN_ABSENT`, `TOKEN_PARSE_ERROR`, `VERIFY_FAILED`.
- `AccessRoles` — enum: `USER`, `ADMIN`.
- `IAuthModuleOptions` — опции `forRoot()`.

### Сервисы

- `AuthHealthIndicatorService`
  - `isReadiness(): Promise<HealthIndicatorResult>` — возвращает `up` если `IAuthService.synchronized()`, иначе `down`.

## Конфигурация `forRoot(options?)`

`AuthModule.forRoot(options?: IAuthModuleOptions)` — все поля опциональны; при вызове без аргументов `MockCertificateService` использует сгенерированный `randomUUID()`.

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `useCertificate` | `false \| string` | нет | `undefined` | Если задана непустая строка — `MockCertificateService` использует её как сертификат для подписи и верификации JWT. При значении `false` / `undefined` или пустой строке сертификат генерируется через `randomUUID()`. |

## Параметры окружения

Модуль не читает переменные окружения: сертификат задаётся через опцию `forRoot({ useCertificate })`. В `main.module.ts` используется фиксированная UUID-строка.

## Примеры использования

### Регистрация модуля

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      useCertificate: '801c29c6-ed2f-4ae4-92fb-fafe914893c0',
    }),
  ],
})
export class MainModule {}
```

### Выдача JWT и проверка входящего токена

```ts
import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  AUTH_SERVICE_DI,
  AccessRoles,
  AuthStatus,
  IAuthService,
} from 'src/modules/auth';

@Controller('auth')
export class AuthDemoController {
  constructor(
    @Inject(AUTH_SERVICE_DI)
    private readonly authService: IAuthService,
  ) {}

  @Get('token')
  public issueToken(): { token: string | undefined } {
    return {
      token: this.authService.getJwtToken({ roles: [AccessRoles.USER] }),
    };
  }

  @Get('check')
  public async check(@Query('token') token: string): Promise<{ ok: boolean }> {
    const info = await this.authService.authenticate(token);

    return { ok: info.status === AuthStatus.SUCCESS };
  }
}
```

### Подключение health-индикатора

```ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AuthHealthIndicatorService } from 'src/modules/auth';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly auth: AuthHealthIndicatorService,
  ) {}

  @Get('readiness-probe')
  @HealthCheck()
  public readiness() {
    return this.health.check([() => this.auth.isReadiness()]);
  }
}
```
