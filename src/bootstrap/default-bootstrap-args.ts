// @TODO Важно что бы импорт src/modules/opentelemetry был первым
import { OpentelemetryBuilder } from 'src/modules/opentelemetry';
// Далее все остальные импорты
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { NestElkLoggerServiceBuilder, ElkLoggerConfig } from 'src/modules/elk-logger';
import {
  ENV_FILES,
  ErrorFormattersFactoryBuilder,
  FormattersFactoryBuilder,
  IgnoreObjectsFactoryBuilder,
  ObjectFormattersFactoryBuilder,
} from 'src/core/app';
import { IBootstrapArgs } from './types';

export function loadDefaultBootstrapArgs(): IBootstrapArgs {
  for (const file of [...ENV_FILES].reverse()) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: true, quiet: true });
    }
  }
  const initConfigService = new ConfigService();

  const nestLogger = NestElkLoggerServiceBuilder.build({
    configService: initConfigService,
    formattersOptions: {
      sortFields: ['timestamp', 'level', 'module', 'message', 'traceId', 'payload'],
      ignoreObjects: IgnoreObjectsFactoryBuilder.build().getCheckObjects(),
      exceptionFormatters: ErrorFormattersFactoryBuilder.build().getFormatters(),
      objectFormatters: ObjectFormattersFactoryBuilder.build().getFormatters(),
    },
    formatters: (elkLoggerConfig: ElkLoggerConfig) => {
      return FormattersFactoryBuilder.build({ elkLoggerConfig }).getFormatters();
    },
  });

  OpentelemetryBuilder.build(initConfigService, nestLogger);

  return {
    logger: nestLogger,
  };
}
