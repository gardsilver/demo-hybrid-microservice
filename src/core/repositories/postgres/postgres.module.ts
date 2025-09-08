import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/modules/database';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { UserModel } from './models/user.model';
import { REPOSITORIES } from './types/repositories';
import { UserService } from './services/user.service';
import { UserCacheFormatter } from './cache-formatters/user.cache-formatter';

@Module({
  imports: [
    ConfigModule,
    ElkLoggerModule,
    PrometheusModule,
    DatabaseModule.forRoot({
      models: [UserModel],
    }),
  ],
  providers: [UserCacheFormatter, UserService, ...REPOSITORIES],
  exports: [UserCacheFormatter, UserService],
})
export class PostgresModule {}
