import { INestElkLoggerService } from 'src/modules/elk-logger';

export interface IBootstrapArgs {
  logger: INestElkLoggerService;
}
