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

export abstract class MigrationSqlBuilder {
  public static build(dialect: string, schema: string | undefined, table: string): IMigrationSqlBuilder {
    switch (dialect) {
      case 'postgres':
        return new PostgresMigrationSqlBuilder(schema, table);
      case 'mysql':
      case 'mariadb':
        return new MysqlMigrationSqlBuilder(schema, table);
      default:
        throw new Error(`MigrationSqlBuilder: unsupported dialect '${dialect}'. Supported: postgres, mysql, mariadb.`);
    }
  }
}

class PostgresMigrationSqlBuilder implements IMigrationSqlBuilder {
  private readonly qualifiedTable: string;
  private readonly schema: string;

  constructor(schema: string | undefined, table: string) {
    if (!schema) {
      throw new Error('MigrationSqlBuilder[postgres]: DATABASE_SCHEMA is required.');
    }
    this.schema = schema;
    this.qualifiedTable = `${schema}.${table}`;
  }

  createIfNotExistsSql(): string {
    return `CREATE TABLE IF NOT EXISTS ${this.qualifiedTable} (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);`;
  }

  acquireLockSql(): string | undefined {
    return undefined;
  }

  releaseLockSql(): string | undefined {
    return undefined;
  }

  beginSql(): string {
    return 'BEGIN;';
  }

  inTransactionLockSql(): string | undefined {
    return `LOCK TABLE ${this.qualifiedTable} IN ACCESS EXCLUSIVE MODE;`;
  }

  commitSql(): string {
    return 'COMMIT;';
  }

  rollbackSql(): string {
    return 'ROLLBACK;';
  }

  listTablesSql(): string {
    return `SELECT tablename AS name FROM pg_tables WHERE schemaname = '${this.schema}';`;
  }

  createTableSql(): string {
    return `CREATE TABLE ${this.qualifiedTable} (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);`;
  }

  listCompletedMigrationsSql(): string {
    return `SELECT name FROM ${this.qualifiedTable};`;
  }

  insertMigrationSql(migrationName: string): string {
    return `INSERT INTO ${this.qualifiedTable} (name) VALUES ('${migrationName}');`;
  }
}

class MysqlMigrationSqlBuilder implements IMigrationSqlBuilder {
  private readonly qualifiedTable: string;
  private readonly schema: string;
  private readonly lockName: string;
  private static readonly LOCK_TIMEOUT_SECONDS = 30;

  constructor(schema: string | undefined, table: string) {
    if (!schema) {
      throw new Error('MigrationSqlBuilder[mysql]: DATABASE_SCHEMA is required.');
    }
    this.schema = schema;
    this.qualifiedTable = `${schema}.${table}`;
    this.lockName = `migration_${schema}_${table}`;
  }

  createIfNotExistsSql(): string {
    return `CREATE TABLE IF NOT EXISTS ${this.qualifiedTable} (apply_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, name varchar(255) NOT NULL);`;
  }

  acquireLockSql(): string | undefined {
    return `SELECT GET_LOCK('${this.lockName}', ${MysqlMigrationSqlBuilder.LOCK_TIMEOUT_SECONDS});`;
  }

  releaseLockSql(): string | undefined {
    return `SELECT RELEASE_LOCK('${this.lockName}');`;
  }

  beginSql(): string {
    return 'START TRANSACTION;';
  }

  inTransactionLockSql(): string | undefined {
    return undefined;
  }

  commitSql(): string {
    return 'COMMIT;';
  }

  rollbackSql(): string {
    return 'ROLLBACK;';
  }

  listTablesSql(): string {
    return `SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${this.schema}';`;
  }

  createTableSql(): string {
    return `CREATE TABLE ${this.qualifiedTable} (apply_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, name varchar(255) NOT NULL);`;
  }

  listCompletedMigrationsSql(): string {
    return `SELECT name FROM ${this.qualifiedTable};`;
  }

  insertMigrationSql(migrationName: string): string {
    return `INSERT INTO ${this.qualifiedTable} (name) VALUES ('${migrationName}');`;
  }
}
