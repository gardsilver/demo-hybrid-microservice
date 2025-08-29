# Hybrid Server Module

## Описание
Модуль для настройки **Hybrid**-сервера: **Middleware**, **Guards**, **Interceptors**, **Pipes** и т.д.

## `HybridErrorResponseFilter`
Перехватывает любые ошибки сервера. В зависимости от типа выполняемого контекста применяет соответствующий фильтр перехватчик ошибок.
Можно подключать глобально или через  декоратор `@UseFilters` (**@see** `@nestjs/common`).

## `LoggingValidationPipe`
Пишет логи ошибок ValidationPipe.
