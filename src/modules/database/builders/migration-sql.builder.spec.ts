import { MigrationSqlBuilder } from './migration-sql.builder';

describe(MigrationSqlBuilder.name, () => {
  describe('postgres', () => {
    const builder = MigrationSqlBuilder.build('postgres', 'public', 'migrations');

    it('createIfNotExistsSql uses TIMESTAMPTZ', () => {
      expect(builder.createIfNotExistsSql()).toBe(
        'CREATE TABLE IF NOT EXISTS public.migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
      );
    });

    it('no advisory lock — lock берётся внутри транзакции', () => {
      expect(builder.acquireLockSql()).toBeUndefined();
      expect(builder.releaseLockSql()).toBeUndefined();
      expect(builder.inTransactionLockSql()).toBe('LOCK TABLE public.migrations IN ACCESS EXCLUSIVE MODE;');
    });

    it('transaction control', () => {
      expect(builder.beginSql()).toBe('BEGIN;');
      expect(builder.commitSql()).toBe('COMMIT;');
      expect(builder.rollbackSql()).toBe('ROLLBACK;');
    });

    it('listTablesSql uses pg_tables', () => {
      expect(builder.listTablesSql()).toBe("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public';");
    });

    it('createTableSql uses TIMESTAMPTZ', () => {
      expect(builder.createTableSql()).toBe(
        'CREATE TABLE public.migrations (apply_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name varchar(255) NOT NULL);',
      );
    });

    it('listCompletedMigrationsSql', () => {
      expect(builder.listCompletedMigrationsSql()).toBe('SELECT name FROM public.migrations;');
    });

    it('insertMigrationSql', () => {
      expect(builder.insertMigrationSql('20260101-foo.js')).toBe(
        "INSERT INTO public.migrations (name) VALUES ('20260101-foo.js');",
      );
    });

    it('throws if schema not set', () => {
      expect(() => MigrationSqlBuilder.build('postgres', undefined, 'migrations')).toThrow(
        /DATABASE_SCHEMA is required/,
      );
    });
  });

  describe('mysql', () => {
    const builder = MigrationSqlBuilder.build('mysql', 'demo', 'migrations');

    it('createIfNotExistsSql uses TIMESTAMP и CURRENT_TIMESTAMP', () => {
      expect(builder.createIfNotExistsSql()).toBe(
        'CREATE TABLE IF NOT EXISTS demo.migrations (apply_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, name varchar(255) NOT NULL);',
      );
    });

    it('advisory lock через GET_LOCK / RELEASE_LOCK', () => {
      expect(builder.acquireLockSql()).toBe("SELECT GET_LOCK('migration_demo_migrations', 30);");
      expect(builder.releaseLockSql()).toBe("SELECT RELEASE_LOCK('migration_demo_migrations');");
      expect(builder.inTransactionLockSql()).toBeUndefined();
    });

    it('transaction control uses START TRANSACTION', () => {
      expect(builder.beginSql()).toBe('START TRANSACTION;');
      expect(builder.commitSql()).toBe('COMMIT;');
      expect(builder.rollbackSql()).toBe('ROLLBACK;');
    });

    it('listTablesSql uses INFORMATION_SCHEMA', () => {
      expect(builder.listTablesSql()).toBe(
        "SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'demo';",
      );
    });

    it('createTableSql uses TIMESTAMP и CURRENT_TIMESTAMP', () => {
      expect(builder.createTableSql()).toBe(
        'CREATE TABLE demo.migrations (apply_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, name varchar(255) NOT NULL);',
      );
    });

    it('listCompletedMigrationsSql', () => {
      expect(builder.listCompletedMigrationsSql()).toBe('SELECT name FROM demo.migrations;');
    });

    it('insertMigrationSql', () => {
      expect(builder.insertMigrationSql('20260101-foo.js')).toBe(
        "INSERT INTO demo.migrations (name) VALUES ('20260101-foo.js');",
      );
    });

    it('throws if schema not set', () => {
      expect(() => MigrationSqlBuilder.build('mysql', undefined, 'migrations')).toThrow(/DATABASE_SCHEMA is required/);
    });
  });

  describe('mariadb — строит тот же билдер, что и mysql', () => {
    it('uses MySQL SQL', () => {
      const builder = MigrationSqlBuilder.build('mariadb', 'demo', 'migrations');

      expect(builder.createIfNotExistsSql()).toContain('TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
      expect(builder.acquireLockSql()).toContain('GET_LOCK');
      expect(builder.beginSql()).toBe('START TRANSACTION;');
    });
  });

  it('throws for unsupported dialect', () => {
    expect(() => MigrationSqlBuilder.build('sqlite', 'public', 'migrations')).toThrow(/unsupported dialect 'sqlite'/);
  });
});
