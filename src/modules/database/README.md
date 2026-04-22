# Database Module

## Описание

Модуль подключения к **DB** с использованием `sequelize-typescript`.
При установке подключения к **DB** автоматически создает таблицу миграций (если таковой не существует) и осуществляет контроль применения новых миграций.

Модуль регистрируется как **global** через `forRoot()` и экспортирует DI-токен `DATABASE_DI` (экземпляр `Sequelize`), создаваемый фабрикой `DatabaseConnectBuilder`.

### Поддерживаемые диалекты

Система миграций поддерживает **Postgres** и **MySQL** / **MariaDB**. Dialect-специфичный SQL генерируется в `MigrationSqlBuilder.build(dialect, schema, table)` и выбирается по `DATABASE_DIALECT`.

| Операция | Postgres | MySQL / MariaDB |
|---|---|---|
| Тип `apply_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| Межпроцессный lock | `LOCK TABLE schema.table IN ACCESS EXCLUSIVE MODE` **внутри** транзакции | `GET_LOCK('migration_<schema>_<table>', 30)` **до** `START TRANSACTION` (MySQL `LOCK TABLES` неявно коммитит транзакцию — используется advisory-lock) |
| Начало транзакции | `BEGIN;` | `START TRANSACTION;` |
| Список таблиц схемы | `SELECT tablename AS name FROM pg_tables WHERE schemaname = '<schema>';` | `SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '<schema>';` |
| Релиз lock после коммита/отката | — (отпускается при завершении транзакции) | `SELECT RELEASE_LOCK('migration_<schema>_<table>');` |

Для другого диалекта (`sqlite`, `mssql` и т.п.) миграции **не применяются** — `MigrationSqlBuilder` выбросит ошибку, она будет залогирована и сконвертирована в метрику `DB_QUERY_FAILED`, но старт сервиса это не сломает (основное подключение остаётся рабочим).

### Опции `forRoot(options?: IModelConfig)`

В `forRoot()` передаются опции моделей (`IModelConfig extends Partial<Pick<SequelizeOptions, 'models' | 'modelPaths' | 'modelMatch' | 'repositoryMode' | 'validateOnly'>>`, пробрасываются напрямую в `SequelizeOptions`). Все поля опциональны; при вызове без аргументов модели не регистрируются автоматически.

| Поле | Тип | Обязательный | По умолчанию | Описание |
|---|---|---|---|---|
| `models` | `ModelCtor[]` | нет | `undefined` | Явный список моделей, подключаемых к Sequelize-инстансу. |
| `modelPaths` | `string[]` | нет | `undefined` | Пути, из которых автоматически подгружаются модели. |
| `modelMatch` | `(filename: string, member: string) => boolean` | нет | `undefined` | Функция фильтрации при автоподгрузке из `modelPaths`. |
| `repositoryMode` | `boolean` | нет | `false` | Включение repository-режима `sequelize-typescript` (получение моделей через `sequelize.getRepository()`). |
| `validateOnly` | `boolean` | нет | `false` | Валидация моделей без реального подключения к БД. |

Параметры подключения (`host`, `port`, `dialect`, `database`, `schema`, `username`, `password`, поведение логгирования) берутся из переменных окружения через `DatabaseConfig`.

## Параметры окружения

| Параметры окружения (**env**)| Обязательный| возможные значения | Описание|
|---|---|---|---|
| `DATABASE_PREFIX` | нет  | Тип **string**. Регистр учитывается. | Если задано, то будет анализироваться таблица миграции, имя которой начинается с указанного значения префикса. |
| `DATABASE_MIGRATIONS_TABLE` | нет. По умолчанию: `migrations`  | Тип **string**. Регистр учитывается. | Если задано, то в качестве названия таблицы миграций будет взято указанное значение с учетом `DATABASE_PREFIX`. Если не указано, тогда будет использовано значение по умолчанию: **migrations**. |
| `DATABASE_MIGRATIONS_ENABLED` | нет. По умолчанию: `yes`  | `yes`, `no` (без учета регистра)| При значении `yes`, после установки соединения с **DB** будут автоматически применены все новые миграции. <br> <u>Примечание.</u><br> Перед созданием новой миграции и ее отладки имеет смысл отключить этот параметр. |
| `DATABASE_HOST` | да  | Тип **string**. Регистр учитывается.| Host сервера **DB**. |
| `DATABASE_PORT` | да  | Тип **number**| Port сервера **DB**. |
| `DATABASE_DIALECT` | нет  | `postgres`, `mysql`, `mariadb` (для миграций). Sequelize поддерживает и другие диалекты, но автоприменение миграций доступно только для перечисленных. | **dialect** подключения к серверу **DB**. |
| `DATABASE_NAME` | нет  | Тип **string**. Регистр учитывается. | Имя базы данных |
| `DATABASE_SCHEMA` | да, если `DATABASE_MIGRATIONS_ENABLED=yes`  | Тип **string**. Регистр учитывается. | **schema** подключения к серверу **DB**. Для Postgres — имя схемы (например, `public`). Для MySQL/MariaDB — имя базы (обычно совпадает с `DATABASE_NAME`). |
| `DATABASE_USER` | нет  | Тип **string**. Регистр учитывается. | Имя пользователя для подключения к серверу **DB**.  |
| `DATABASE_PASSWORD` | нет  | Тип **string**. Регистр учитывается. | Пароль пользователя для подключения к серверу **DB**.  |
| `DATABASE_LOGGING_ENABLED` | нет. По умолчанию: `no`   | `yes`, `no` (без учета регистра) | Если указано `yes`, тогда дополнительно будут писаться логи всех **SQL-запросов** к **DB** |

## Поведение миграций

При старте модуля, если `DATABASE_MIGRATIONS_ENABLED=yes`:

1. В схеме `DATABASE_SCHEMA` создаётся таблица миграций (`[DATABASE_PREFIX_]DATABASE_MIGRATIONS_TABLE`), если она ещё не существует.
2. Для защиты от гонок при параллельном запуске нескольких инстансов берётся lock:
   - **Postgres** — `LOCK TABLE ... IN ACCESS EXCLUSIVE MODE` внутри транзакции.
   - **MySQL/MariaDB** — advisory-lock `GET_LOCK(...)` до открытия транзакции (у `LOCK TABLES` в MySQL есть side-эффект в виде неявного `COMMIT`, поэтому используется advisory).
3. Из каталога `migrations/` подгружаются все `.js`-файлы; те из них, которые ещё не отмечены в таблице миграций, выполняются последовательно методом `up()`.
4. После успешного выполнения имя миграции записывается в таблицу миграций, транзакция коммитится. Для MySQL lock после коммита освобождается через `RELEASE_LOCK(...)`.
5. Если одна из миграций упала — выполняется `ROLLBACK` (для MySQL дополнительно `RELEASE_LOCK(...)`) и увеличивается метрика `DB_QUERY_FAILED`.

## Создание миграций

Прежде всего отключите параметр `DATABASE_MIGRATIONS_ENABLED`.
Выполните консольную команду

```sh
  npm run migrate:generate имя_миграции
```

Будет создан новый **js**-файл миграции с указанным именем в каталоге **migrations**. Откройте его и внесите необходимые правки.
Миграция будет автоматически применена при следующем запуске приложения с включенной опцией `DATABASE_MIGRATIONS_ENABLED`.

### Важно

Микросервисная архитектура подразумевает движение **вперед**, поэтому откат миграций не предусмотрен.
Так же стоит учитывать длительность выполнения новых миграций, общая длительность применения которых не должна превышать 30 сек (точное значение  длительности будет зависеть от настройки **Kubernetes** или его аналога).

## Пример использования

Определяем модель `sequelize-typescript`:

```ts
import { Column, Model, DataType, Table } from 'sequelize-typescript';

@Table({
  tableName: 'users',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class UserModel extends Model<IUser> implements IUser {
  @Column({ primaryKey: true, autoIncrement: true, type: DataType.BIGINT })
  declare id?: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;
}
```

Регистрируем `DatabaseModule` со списком моделей и внедряем модель в репозиторный сервис через `getModelToken`:

```ts
import { Module, Injectable, Inject } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { DatabaseModule } from 'src/modules/database';

@Module({
  imports: [
    DatabaseModule.forRoot({
      models: [UserModel],
    }),
  ],
  providers: [UserService],
  exports: [UserService],
})
export class PostgresModule {}

@Injectable()
export class UserService {
  constructor(
    @Inject(getModelToken(UserModel))
    private readonly repository: typeof UserModel,
  ) {}

  public async findUser(id: number): Promise<UserModel | null> {
    return this.repository.findOne({ where: { id } });
  }
}
```

## `DatabaseHealthIndicator`

Health-индикатор (`@nestjs/terminus`), экспортируемый модулем. Комбинирует стандартный ping через `SequelizeHealthIndicator` и состояние применения миграций, отражающееся в `DatabaseMigrationStatusService`. Ключ в отчёте — `DataBase`.

```ts
isHealthy(options?: { timeout?: number; migrationFailedStatus?: 'up' | 'down' }): Promise<HealthIndicatorResult>
```

- `timeout` (по умолчанию `10_000` мс) передаётся в `SequelizeHealthIndicator.pingCheck`.
- `migrationFailedStatus` (по умолчанию `'down'`) определяет, какой статус вернуть индикатор, если миграции не были применены (например, упала одна из миграций при старте или диалект не поддерживается `MigrationSqlBuilder`).
- **Фактическое** состояние ping и миграций **всегда** отражается в `details`:
  - `ping`: `'ok'` или текст ошибки.
  - `migration`: `'ok'` или `{ error: string, failedMigration?: string }` — имя файла последней проваленной миграции (если падение было внутри `instance.up()`).
- Отказ ping'а **всегда** возвращает `down` — реальная недоступность БД не настраивается через опции.
- При успешном ping'е но неуспешных миграциях статус настраивается через `migrationFailedStatus`:
  - `down` (default): probe красный — подходит для readiness, чтобы pod не получал трафик до применения миграций. Доп. лог индикатор не пишет: сам факт падения уже залогирован `DatabaseConnectBuilder.migrateUp` (error) при старте, а probe красный и так виден.
  - `up`: probe зелёный с `details`, отражающими проблему — подходит для liveness, чтобы падение миграций не рестартило pod. В этом случае **каждый** вызов `isHealthy()` дополнительно пишет **warning-лог** `"Database migrations failed — probe reports up due to migrationFailedStatus option"` с `payload.migration` и `payload.exception`: оператор должен видеть, что зелёный статус скрывает реальную проблему.

В проекте используется так (см. `src/health/controllers/health.controller.ts`):

```ts
// liveness: не падаем из-за миграций (но реальная потеря БД — down).
() => this.dbHealth.isHealthy({ migrationFailedStatus: 'up' })

// readiness: без миграций pod не принимает трафик.
() => this.dbHealth.isHealthy()
```

## `DatabaseMigrationStatusService`

Вспомогательный сервис: хранит результат последнего запуска миграций. Обновляется `DatabaseConnectBuilder.migrateUp` (`markSuccess` / `markFailure`) и читается `DatabaseHealthIndicator`. Начальное состояние — healthy (ничего не пробовали = ничего не упало).

## `DataBaseErrorFormatter`

Лог-форматер `BaseError` и `ValidationErrorItem` (**@see** `sequelize`): `IObjectFormatter<BaseError | ValidationErrorItem>`.

## Метрики

Данный модуль содержит стандартные бизнес-метрики длительности выполнения запросов к **DB**.

| Метрика| Метки |Описание|
|---|---|---|
|`DB_QUERY_DURATIONS`|  **labelNames** `['service', 'method']` | Гистограмма длительностей запросов к **DB** и их количество. |
|`DB_QUERY_FAILED`|  **labelNames** `['service', 'method']` | Количество не успешных запросов к **DB** |
