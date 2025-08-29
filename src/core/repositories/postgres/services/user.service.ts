import { Inject, Injectable } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerServiceBuilder } from 'src/modules/elk-logger';
import { LoggerMarkers } from 'src/modules/common';
import { PrometheusManager } from 'src/modules/prometheus';
import { DB_QUERY_DURATIONS, DB_QUERY_FAILED, DatabaseHelper } from 'src/modules/database';
import { IIdentityUser, IUser } from '../types/types';
import { UserModel } from '../models/user.model';

@Injectable()
export class UserService {
  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    private readonly prometheusManager: PrometheusManager,
    @Inject(getModelToken(UserModel))
    private readonly repository: typeof UserModel,
  ) {}

  public async findUser(identity: IIdentityUser): Promise<IUser> {
    const labels = {
      service: 'UserService',
      method: 'findUser',
    };

    const filter = identity?.id ? { id: identity?.id } : identity;

    const logger = this.loggerBuilder.build({
      module: `${labels.service}.${labels.method}`,
      markers: [LoggerMarkers.DB],
      payload: {
        request: identity,
        filter: {
          where: {
            ...filter,
          },
        },
      },
    });

    logger.info('DB request', {
      markers: [LoggerMarkers.REQUEST],
    });

    const end = this.prometheusManager.histogram().startTimer(DB_QUERY_DURATIONS, { labels });

    try {
      const model = await this.repository.findOne({
        where: {
          ...filter,
        },
      });

      logger.info('DB response success', {
        markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
        payload: {
          result: DatabaseHelper.modelToLogFormat(model),
        },
      });

      return model;
    } catch (error) {
      this.prometheusManager.counter().increment(DB_QUERY_FAILED);

      logger.error(`DB request filed`, {
        markers: [LoggerMarkers.REQUEST, LoggerMarkers.FAILED],
        payload: {
          error: error,
        },
      });

      throw error;
    } finally {
      end();
    }
  }
}
