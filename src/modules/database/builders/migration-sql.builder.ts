import { IMigrationSqlBuilder } from './dialect/migration-sql.builder';
import { MysqlMigrationSqlBuilder } from './dialect/mysql.migration-sql.builder';
import { PostgresMigrationSqlBuilder } from './dialect/postgres.migration-sql.builder';

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
