import { Inject, Injectable } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { LoggerMarkers } from 'src/modules/common';
import { ElkLoggerOnMethod, ElkLoggerOnService } from 'src/modules/elk-logger';
import { PrometheusMetricConfigOnService, PrometheusOnMethod } from 'src/modules/prometheus';
import { DB_QUERY_DURATIONS, DB_QUERY_FAILED, DatabaseHelper } from 'src/modules/database';
import { IIdentityUser, IUser } from '../types/types';
import { UserModel } from '../models/user.model';

@PrometheusMetricConfigOnService({
  labels: {
    service: 'UserService',
  },
  counter: DB_QUERY_FAILED,
  histogram: DB_QUERY_DURATIONS,
})
@ElkLoggerOnService({
  fields: () => {
    return {
      markers: [LoggerMarkers.DB],
    };
  },
})
@Injectable()
export class UserService {
  constructor(
    @Inject(getModelToken(UserModel))
    private readonly repository: typeof UserModel,
  ) {}

  @PrometheusOnMethod({
    labels: ({ labels }) => {
      return {
        ...labels,
        method: 'findUser',
      };
    },
    before: {
      histogram: {
        startTimer: true,
      },
    },
    throw: {
      counter: {
        increment: true,
      },
    },
  })
  @ElkLoggerOnMethod({
    fields: ({ methodsArgs }) => {
      const identity = methodsArgs[0] as undefined as IIdentityUser;

      return {
        payload: {
          payload: { request: methodsArgs },
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
    const filter = identity?.id ? { id: identity?.id } : identity;
    const model = await this.repository.findOne({
      where: {
        ...filter,
      },
    });

    return model;
  }
}
