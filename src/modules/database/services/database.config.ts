import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';

@Injectable()
export class DatabaseConfig {
  private readonly migrationsEnabled: boolean;
  private readonly migrationsTable: string;
  private readonly host: string;
  private readonly port: number;
  private readonly dialect: string;
  private readonly databaseName: string;
  private readonly prefix: string;
  private readonly databaseSchema: string;
  private readonly user: string;
  private readonly password: string;
  private readonly loggingEnabled: boolean;

  constructor(readonly config: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(config, 'DATABASE_');

    this.migrationsEnabled = configServiceHelper.parseBoolean('MIGRATIONS_ENABLED');
    this.migrationsTable = config.get<string>(configServiceHelper.getKeyName('MIGRATIONS_TABLE'), 'migrations')?.trim();
    this.host = config.get<string>(configServiceHelper.getKeyName('HOST'))?.trim();
    this.port = configServiceHelper.parseInt('PORT', undefined);
    this.dialect = config.get<string>(configServiceHelper.getKeyName('DIALECT'))?.trim();
    this.databaseName = config.get<string>(configServiceHelper.getKeyName('NAME'))?.trim();
    this.prefix = config.get<string>(configServiceHelper.getKeyName('PREFIX'))?.trim();
    this.databaseSchema = config.get<string>(configServiceHelper.getKeyName('SCHEMA'))?.trim();
    this.user = config.get<string>(configServiceHelper.getKeyName('USER'))?.trim();
    this.password = config.get<string>(configServiceHelper.getKeyName('PASSWORD'))?.trim();
    this.loggingEnabled = configServiceHelper.parseBoolean('LOGGING_ENABLED', false);
  }

  getMigrationsEnabled(): boolean {
    return this.migrationsEnabled;
  }
  getMigrationsTable(): string {
    return this.migrationsTable;
  }

  getHost(): string {
    return this.host;
  }

  getPort(): number {
    return this.port;
  }

  getDialect(): string {
    return this.dialect;
  }

  getDatabaseName(): string {
    return this.databaseName;
  }

  getPrefix(): string {
    return this.prefix ?? undefined;
  }

  getDatabaseSchema(): string {
    return this.databaseSchema;
  }

  getUser(): string {
    return this.user ?? undefined;
  }

  getPassword(): string {
    return this.password ?? undefined;
  }

  getLoggingEnabled(): boolean {
    return this.loggingEnabled;
  }
}
