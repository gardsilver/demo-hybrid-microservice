import { Inject, Injectable } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { LoggerMarkers } from 'src/modules/common';
import { ElkLoggerOnMethod } from 'src/modules/elk-logger';
import { PrometheusManager } from 'src/modules/prometheus';
import { DB_QUERY_DURATIONS, DB_QUERY_FAILED, DatabaseHelper } from 'src/modules/database';
import { IIdentityUser, IUser } from '../types/types';
import { UserModel } from '../models/user.model';

@Injectable()
export class UserService {
  constructor(
    private readonly prometheusManager: PrometheusManager,
    @Inject(getModelToken(UserModel))
    private readonly repository: typeof UserModel,
  ) {}

  @ElkLoggerOnMethod({
    fields: (options) => {
      const identity = options.methodsArgs[0] as undefined as IIdentityUser;

      return {
        markers: [LoggerMarkers.DB],
        payload: {
          request: identity,
          filter: {
            where: {
              ...(identity?.id ? { id: identity?.id } : identity),
            },
          },
        },
      };
    },
    before: {
      message: 'DB request',
      data: {
        markers: [LoggerMarkers.REQUEST],
      },
    },
    after: ({ result }) => {
      return {
        message: 'DB response success',
        data: {
          markers: [LoggerMarkers.RESPONSE, LoggerMarkers.SUCCESS],
          payload: {
            result: DatabaseHelper.modelToLogFormat(result),
          },
        },
      };
    },
    throw: ({ error }) => {
      return {
        message: 'DB request failed',
        data: {
          markers: [LoggerMarkers.REQUEST, LoggerMarkers.FAILED],
          payload: {
            error,
          },
        },
      };
    },
  })
  public async findUser(identity: IIdentityUser): Promise<IUser> {
    const labels = {
      service: 'UserService',
      method: 'findUser',
    };
    const filter = identity?.id ? { id: identity?.id } : identity;
    const end = this.prometheusManager.histogram().startTimer(DB_QUERY_DURATIONS, { labels });

    try {
      const model = await this.repository.findOne({
        where: {
          ...filter,
        },
      });

      return model;
    } catch (error) {
      this.prometheusManager.counter().increment(DB_QUERY_FAILED, { labels });

      throw error;
    } finally {
      end();
    }
  }
}
