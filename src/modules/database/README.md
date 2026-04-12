# Database Module

## Описание

Модуль подключения к **DB** с использованием `sequelize-typescript`.
При установке подключения к **DB** автоматически создает таблицу миграций (если таковой не существует) и осуществляет контроль применения новых миграций.

Модуль регистрируется как **global** через `forRoot()` и экспортирует DI-токен `DATABASE_DI` (экземпляр `Sequelize`), создаваемый фабрикой `DatabaseConnectBuilder`.

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
| `DATABASE_DIALECT` | нет  | Тип **string**. Регистр учитывается. | **dialect** подключения к серверу **DB**. <br> Например: **postgres** |
| `DATABASE_NAME` | нет  | Тип **string**. Регистр учитывается. | Имя базы данных |
| `DATABASE_SCHEMA` | нет  | Тип **string**. Регистр учитывается. | **schema** подключения к серверу **DB**. <br> Например: **public** |
| `DATABASE_USER` | нет  | Тип **string**. Регистр учитывается. | Имя пользователя для подключения к серверу **DB**.  |
| `DATABASE_PASSWORD` | нет  | Тип **string**. Регистр учитывается. | Пароль пользователя для подключения к серверу **DB**.  |
| `DATABASE_LOGGING_ENABLED` | нет. По умолчанию: `no`   | `yes`, `no` (без учета регистра) | Если указано `yes`, тогда дополнительно будут писаться логи всех **SQL-запросов** к **DB** |

## Поведение миграций

При старте модуля, если `DATABASE_MIGRATIONS_ENABLED=yes`:

1. В схеме `DATABASE_SCHEMA` создаётся таблица миграций (`[DATABASE_PREFIX_]DATABASE_MIGRATIONS_TABLE`), если она ещё не существует.
2. Таблица захватывается в `ACCESS EXCLUSIVE` режиме в рамках транзакции — это защищает от гонок при параллельном запуске нескольких инстансов сервиса.
3. Из каталога `migrations/` подгружаются все `.js`-файлы; те из них, которые ещё не отмечены в таблице миграций, выполняются последовательно методом `up()`.
4. После успешного выполнения имя миграции записывается в таблицу миграций, транзакция коммитится.
5. Если одна из миграций упала — выполняется `ROLLBACK` и увеличивается метрика `DB_QUERY_FAILED`.

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

## `DataBaseErrorFormatter`

Лог-форматер `BaseError` и `ValidationErrorItem` (**@see** `sequelize`): `IObjectFormatter<BaseError | ValidationErrorItem>`.

## Метрики

Данный модуль содержит стандартные бизнес-метрики длительности выполнения запросов к **DB**.

| Метрика| Метки |Описание|
|---|---|---|
|`DB_QUERY_DURATIONS`|  **labelNames** `['service', 'method']` | Гистограмма длительностей запросов к **DB** и их количество. |
|`DB_QUERY_FAILED`|  **labelNames** `['service', 'method']` | Количество не успешных запросов к **DB** |
