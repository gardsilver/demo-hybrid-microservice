export interface IMigrationSqlBuilder {
  // Выполняется до открытия транзакции (best-effort: уменьшает частоту одновременных CREATE внутри лока).
  createIfNotExistsSql(): string;
  // Межпроцессный lock. Для MySQL — advisory lock через GET_LOCK (берётся до BEGIN, чтобы не
  // конфликтовать с semantics MySQL LOCK TABLES, которая неявно коммитит транзакцию).
  // Для Postgres — undefined: lock берётся внутри транзакции через inTransactionLockSql().
  acquireLockSql(): string | undefined;
  releaseLockSql(): string | undefined;
  beginSql(): string;
  // Lock внутри транзакции (PG: LOCK TABLE ... IN ACCESS EXCLUSIVE MODE). MySQL — undefined.
  inTransactionLockSql(): string | undefined;
  commitSql(): string;
  rollbackSql(): string;
  // Проверка существования таблицы миграций. Результирующие строки имеют поле `.name`.
  listTablesSql(): string;
  createTableSql(): string;
  // Список уже применённых миграций. Результирующие строки имеют поле `.name`.
  listCompletedMigrationsSql(): string;
  insertMigrationSql(migrationName: string): string;
}
