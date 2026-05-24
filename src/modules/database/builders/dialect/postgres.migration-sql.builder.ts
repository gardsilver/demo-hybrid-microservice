import { IMigrationSqlBuilder } from './migration-sql.builder';

export class PostgresMigrationSqlBuilder implements IMigrationSqlBuilder {
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
