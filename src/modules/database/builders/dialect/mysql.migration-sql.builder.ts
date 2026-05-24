import { IMigrationSqlBuilder } from './migration-sql.builder';

export class MysqlMigrationSqlBuilder implements IMigrationSqlBuilder {
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
