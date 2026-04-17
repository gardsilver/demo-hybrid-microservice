import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';

@Injectable()
export class DatabaseConfig {
  private readonly migrationsEnabled: boolean;
  private readonly migrationsTable: string | undefined;
  private readonly host: string | undefined;
  private readonly port: number | undefined;
  private readonly dialect: string | undefined;
  private readonly databaseName: string | undefined;
  private readonly prefix: string | undefined;
  private readonly databaseSchema: string | undefined;
  private readonly user: string | undefined;
  private readonly password: string | undefined;
  private readonly loggingEnabled: boolean;

  constructor(readonly config: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(config, 'DATABASE_');

    this.migrationsEnabled = configServiceHelper.parseBoolean('MIGRATIONS_ENABLED');
    this.migrationsTable = config.get<string>(configServiceHelper.getKeyName('MIGRATIONS_TABLE'))?.trim() || 'migrations';
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
  getMigrationsTable(): string | undefined {
    return this.migrationsTable;
  }

  getHost(): string | undefined {
    return this.host;
  }

  getPort(): number | undefined {
    return this.port;
  }

  getDialect(): string | undefined {
    return this.dialect;
  }

  getDatabaseName(): string | undefined {
    return this.databaseName;
  }

  getPrefix(): string | undefined {
    return this.prefix || undefined;
  }

  getDatabaseSchema(): string | undefined {
    return this.databaseSchema;
  }

  getUser(): string | undefined {
    return this.user || undefined;
  }

  getPassword(): string | undefined {
    return this.password || undefined;
  }

  getLoggingEnabled(): boolean {
    return this.loggingEnabled;
  }
}
