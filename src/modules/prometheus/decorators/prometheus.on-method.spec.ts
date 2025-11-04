/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { METRIC_COUNTER, METRIC_GAUGE, METRIC_HISTOGRAM, METRIC_SUMMARY } from 'tests/modules/prometheus';
import { PrometheusDecoratorHelper } from '../helpers/prometheus.decorator.helper';
import { PrometheusOnMethod } from './prometheus.on-method';
import { PrometheusEventConfigDecoratorHelper } from '../helpers/prometheus.event-config.decorator.helper';
import { PrometheusEventService } from '../services/prometheus.event-service';
import { PrometheusLabels } from '../types/types';
import { IPrometheusEventConfig, IPrometheusOnMethod, ITargetPrometheusOnMethod } from '../types/decorators.type';
import { PrometheusMetricConfigOnService } from './prometheus.metric-config.on-service';

let mockUuid;

jest.mock('crypto', () => {
  const actualMoment = jest.requireActual('crypto');

  return {
    ...actualMoment,
    randomUUID: () => mockUuid,
  };
});

const eventConfigBuilder = (): IPrometheusEventConfig => {
  return {
    counter: {
      increment: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
    },
    gauge: {
      increment: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
      decrement: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
    },
    histogram: {
      observe: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
      startTimer: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
      end: {
        labels: {
          status: faker.string.alpha(5),
        },
      },
    },
    summary: {
      observe: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
      startTimer: {
        metricConfig: {
          name: faker.string.alpha(5),
          help: faker.string.alpha(5),
          labelNames: ['method'],
        },
        params: {
          labels: {
            method: faker.string.alpha(5),
          },
          value: faker.number.int(10),
        },
      },
      end: {
        labels: {
          status: faker.string.alpha(5),
        },
      },
    },
    custom: jest.fn(),
  };
};

const useEventConfig: IPrometheusOnMethod = {
  labels: {
    method: faker.string.alpha(8),
  },
  before: eventConfigBuilder(),
  after: eventConfigBuilder(),
  throw: eventConfigBuilder(),
  finally: eventConfigBuilder(),
};

describe('PrometheusOnMethod', () => {
  let spyBuildLabels;
  let spyBuildEventConfig;
  let spyEmit;

  let context: IGeneralAsyncContext;

  let defaultLabels: PrometheusLabels;
  let eventConfig: IPrometheusEventConfig;

  let mockError;

  beforeEach(async () => {
    spyBuildLabels = jest.fn().mockImplementation(() => defaultLabels);
    spyBuildEventConfig = jest.fn().mockImplementation(() => eventConfig);
    spyEmit = jest.fn();

    PrometheusDecoratorHelper.buildLabels = spyBuildLabels;
    PrometheusEventConfigDecoratorHelper.build = spyBuildEventConfig;
    PrometheusEventService.emit = spyEmit;

    mockUuid = faker.string.uuid();

    context = {
      ...TraceSpanBuilder.build(),
    };

    defaultLabels = {
      service: faker.string.alpha(5),
    };

    eventConfig = eventConfigBuilder();

    mockError = new Error('Test error');

    jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => context);
    jest.spyOn(DateTimestamp.prototype, 'diff').mockImplementation(() => 20_000);

    jest.clearAllMocks();
  });

  describe('no async', () => {
    describe('default', () => {
      class TestService {
        @PrometheusOnMethod({})
        runOk(status: string) {
          return status;
        }

        @PrometheusOnMethod({})
        runError(status: string) {
          throw mockError;
        }
      }

      let service: TestService;
      let params: ITargetPrometheusOnMethod;

      beforeEach(async () => {
        service = new TestService();

        params = {
          instanceName: 'TestService',
          methodName: 'runOk',
          context,
          flush: false,
          prometheusEventConfig: false,
        };
      });

      it('success', async () => {
        let result = undefined;

        result = service.runOk('success');

        expect(result).toBe('success');

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(undefined, false);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
          {
            histogram: {
              value: 20,
              end: true,
            },
            summary: {
              value: 20,
              end: true,
            },
          },
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );

        // after
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            result,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );
      });

      it('failed', async () => {
        let result = undefined;

        params.methodName = 'runError';
        try {
          result = service.runError('success');
        } catch (err) {
          result = err;
        }

        expect(result).toEqual(mockError);

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(undefined, false);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // throw
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            error: mockError,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
          {
            histogram: {
              value: 20,
              end: true,
            },
            summary: {
              value: 20,
              end: true,
            },
          },
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );
      });
    });

    describe('custom config', () => {
      const defaultOption = {
        labels: {
          service: 'UserService',
        },
        counter: METRIC_COUNTER,
        gauge: METRIC_GAUGE,
        histogram: METRIC_HISTOGRAM,
        summary: METRIC_SUMMARY,
      };

      @PrometheusMetricConfigOnService(defaultOption)
      class TestService {
        @PrometheusOnMethod({
          ...useEventConfig,
        })
        runOk(status: string) {
          return status;
        }

        @PrometheusOnMethod({
          ...useEventConfig,
        })
        runError(status: string) {
          throw mockError;
        }
      }

      let service: TestService;
      let params: ITargetPrometheusOnMethod;

      beforeEach(async () => {
        params = {
          instanceName: 'TestService',
          methodName: 'runOk',
          context,
          flush: false,
          prometheusEventConfig: false,
        };

        service = new TestService();
      });

      it('success', async () => {
        let result = undefined;

        result = service.runOk('success');

        expect(result).toBe('success');

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );

        // after
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.after, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            result,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );
      });

      it('failed', async () => {
        let result = undefined;

        params.methodName = 'runError';
        try {
          result = service.runError('success');
        } catch (err) {
          result = err;
        }

        expect(result).toEqual(mockError);

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // throw
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.throw, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            error: mockError,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );
      });
    });

    describe('custom function', () => {
      const defaultOption = {
        labels: {
          service: 'UserService',
        },
        counter: METRIC_COUNTER,
        gauge: METRIC_GAUGE,
        histogram: METRIC_HISTOGRAM,
        summary: METRIC_SUMMARY,
      };

      const spyLabel = jest.fn().mockImplementation(() => useEventConfig.labels);
      const spyBefore = jest.fn().mockImplementation(() => useEventConfig.before);
      const spyAfter = jest.fn().mockImplementation(() => useEventConfig.after);
      const spyThrow = jest.fn().mockImplementation(() => useEventConfig.throw);
      const spyFinally = jest.fn().mockImplementation(() => useEventConfig.finally);

      @PrometheusMetricConfigOnService(defaultOption)
      class TestService {
        @PrometheusOnMethod({
          labels: spyLabel,
          before: spyBefore,
          after: spyAfter,
          throw: spyThrow,
          finally: spyFinally,
        })
        runOk(status: string) {
          return status;
        }

        @PrometheusOnMethod({
          labels: spyLabel,
          before: spyBefore,
          after: spyAfter,
          throw: spyThrow,
          finally: spyFinally,
        })
        runError(status: string) {
          throw mockError;
        }
      }

      let service: TestService;
      let params: ITargetPrometheusOnMethod;

      beforeEach(async () => {
        params = {
          instanceName: 'TestService',
          methodName: 'runOk',
          context,
          flush: false,
          prometheusEventConfig: false,
        };

        service = new TestService();
      });

      it('success', async () => {
        let result = undefined;

        result = service.runOk('success');

        expect(result).toBe('success');

        expect(spyLabel).toHaveBeenCalledTimes(1);
        expect(spyLabel).toHaveBeenCalledWith({
          labels: defaultOption.labels,
          methodsArgs: ['success'],
        });
        expect(spyBefore).toHaveBeenCalledTimes(1);
        expect(spyBefore).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
        });
        expect(spyAfter).toHaveBeenCalledTimes(1);
        expect(spyAfter).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
          result,
        });
        expect(spyThrow).toHaveBeenCalledTimes(0);
        expect(spyFinally).toHaveBeenCalledTimes(1);
        expect(spyFinally).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
        });

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );

        // after
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.after, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            result,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );
      });

      it('failed', async () => {
        let result = undefined;

        params.methodName = 'runError';
        try {
          result = service.runError('success');
        } catch (err) {
          result = err;
        }

        expect(result).toEqual(mockError);

        expect(spyLabel).toHaveBeenCalledTimes(1);
        expect(spyLabel).toHaveBeenCalledWith({
          labels: defaultOption.labels,
          methodsArgs: ['success'],
        });
        expect(spyBefore).toHaveBeenCalledTimes(1);
        expect(spyBefore).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
        });
        expect(spyAfter).toHaveBeenCalledTimes(0);
        expect(spyThrow).toHaveBeenCalledTimes(1);
        expect(spyThrow).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
          error: mockError,
        });
        expect(spyFinally).toHaveBeenCalledTimes(1);
        expect(spyFinally).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
        });

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // throw
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.throw, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            error: mockError,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );
      });
    });
  });

  describe('async', () => {
    describe('default', () => {
      class TestService {
        @PrometheusOnMethod({})
        async runOk(status: string) {
          return status;
        }

        @PrometheusOnMethod({})
        async runError(status: string) {
          throw mockError;
        }
      }

      let service: TestService;
      let params: ITargetPrometheusOnMethod;

      beforeEach(async () => {
        service = new TestService();

        params = {
          instanceName: 'TestService',
          methodName: 'runOk',
          context,
          flush: false,
          prometheusEventConfig: false,
        };
      });

      it('success', async () => {
        let result = undefined;

        result = await service.runOk('success');

        expect(result).toBe('success');

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(undefined, false);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
          {
            histogram: {
              value: 20,
              end: true,
            },
            summary: {
              value: 20,
              end: true,
            },
          },
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );

        // after
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            result,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );
      });

      it('failed', async () => {
        let result = undefined;

        params.methodName = 'runError';
        try {
          result = await service.runError('success');
        } catch (err) {
          result = err;
        }

        expect(result).toEqual(mockError);

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(undefined, false);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // throw
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
        );

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            error: mockError,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(
          false,
          {
            labels: false,
            counter: false,
            gauge: false,
            histogram: false,
            summary: false,
          },
          defaultLabels,
          {
            histogram: {
              value: 20,
              end: true,
            },
            summary: {
              value: 20,
              end: true,
            },
          },
        );
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );
      });
    });

    describe('custom config', () => {
      const defaultOption = {
        labels: {
          service: 'UserService',
        },
        counter: METRIC_COUNTER,
        gauge: METRIC_GAUGE,
        histogram: METRIC_HISTOGRAM,
        summary: METRIC_SUMMARY,
      };

      @PrometheusMetricConfigOnService(defaultOption)
      class TestService {
        @PrometheusOnMethod({
          ...useEventConfig,
        })
        async runOk(status: string) {
          return status;
        }

        @PrometheusOnMethod({
          ...useEventConfig,
        })
        async runError(status: string) {
          throw mockError;
        }
      }

      let service: TestService;
      let params: ITargetPrometheusOnMethod;

      beforeEach(async () => {
        params = {
          instanceName: 'TestService',
          methodName: 'runOk',
          context,
          flush: false,
          prometheusEventConfig: false,
        };

        service = new TestService();
      });

      it('success', async () => {
        let result = undefined;

        result = await service.runOk('success');

        expect(result).toBe('success');

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );

        // after
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.after, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            result,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );
      });

      it('failed', async () => {
        let result = undefined;

        params.methodName = 'runError';
        try {
          result = await service.runError('success');
        } catch (err) {
          result = err;
        }

        expect(result).toEqual(mockError);

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // throw
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.throw, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            error: mockError,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );
      });
    });

    describe('custom function', () => {
      const defaultOption = {
        labels: {
          service: 'UserService',
        },
        counter: METRIC_COUNTER,
        gauge: METRIC_GAUGE,
        histogram: METRIC_HISTOGRAM,
        summary: METRIC_SUMMARY,
      };

      const spyLabel = jest.fn().mockImplementation(() => useEventConfig.labels);
      const spyBefore = jest.fn().mockImplementation(() => useEventConfig.before);
      const spyAfter = jest.fn().mockImplementation(() => useEventConfig.after);
      const spyThrow = jest.fn().mockImplementation(() => useEventConfig.throw);
      const spyFinally = jest.fn().mockImplementation(() => useEventConfig.finally);

      @PrometheusMetricConfigOnService(defaultOption)
      class TestService {
        @PrometheusOnMethod({
          labels: spyLabel,
          before: spyBefore,
          after: spyAfter,
          throw: spyThrow,
          finally: spyFinally,
        })
        async runOk(status: string) {
          return status;
        }

        @PrometheusOnMethod({
          labels: spyLabel,
          before: spyBefore,
          after: spyAfter,
          throw: spyThrow,
          finally: spyFinally,
        })
        async runError(status: string) {
          throw mockError;
        }
      }

      let service: TestService;
      let params: ITargetPrometheusOnMethod;

      beforeEach(async () => {
        params = {
          instanceName: 'TestService',
          methodName: 'runOk',
          context,
          flush: false,
          prometheusEventConfig: false,
        };

        service = new TestService();
      });

      it('success', async () => {
        let result = undefined;

        result = await service.runOk('success');

        expect(result).toBe('success');

        expect(spyLabel).toHaveBeenCalledTimes(1);
        expect(spyLabel).toHaveBeenCalledWith({
          labels: defaultOption.labels,
          methodsArgs: ['success'],
        });
        expect(spyBefore).toHaveBeenCalledTimes(1);
        expect(spyBefore).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
        });
        expect(spyAfter).toHaveBeenCalledTimes(1);
        expect(spyAfter).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
          result,
        });
        expect(spyThrow).toHaveBeenCalledTimes(0);
        expect(spyFinally).toHaveBeenCalledTimes(1);
        expect(spyFinally).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
        });

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );

        // after
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.after, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            result,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );
      });

      it('failed', async () => {
        let result = undefined;

        params.methodName = 'runError';
        try {
          result = await service.runError('success');
        } catch (err) {
          result = err;
        }

        expect(result).toEqual(mockError);

        expect(spyLabel).toHaveBeenCalledTimes(1);
        expect(spyLabel).toHaveBeenCalledWith({
          labels: defaultOption.labels,
          methodsArgs: ['success'],
        });
        expect(spyBefore).toHaveBeenCalledTimes(1);
        expect(spyBefore).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
        });
        expect(spyAfter).toHaveBeenCalledTimes(0);
        expect(spyThrow).toHaveBeenCalledTimes(1);
        expect(spyThrow).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
          error: mockError,
        });
        expect(spyFinally).toHaveBeenCalledTimes(1);
        expect(spyFinally).toHaveBeenCalledWith({
          labels: defaultLabels,
          methodsArgs: ['success'],
          duration: 20,
        });

        expect(spyBuildLabels).toHaveBeenCalledTimes(1);
        expect(spyBuildLabels).toHaveBeenCalledWith(useEventConfig.labels, defaultOption.labels);

        expect(spyBuildEventConfig).toHaveBeenCalledTimes(3);
        expect(spyEmit).toHaveBeenCalledTimes(3);

        // before
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.before, defaultOption, defaultLabels);
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // throw
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.throw, defaultOption, defaultLabels);

        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            error: mockError,
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            prometheusEventConfig: eventConfig,
          },
        );

        // finally
        expect(spyBuildEventConfig).toHaveBeenCalledWith(useEventConfig.finally, defaultOption, defaultLabels, {
          histogram: {
            value: 20,
            end: true,
          },
          summary: {
            value: 20,
            end: true,
          },
        });
        expect(spyEmit).toHaveBeenCalledWith(
          mockUuid,
          {
            duration: 20,
            labels: defaultLabels,
            methodsArgs: ['success'],
          },
          {
            ...params,
            flush: true,
            prometheusEventConfig: eventConfig,
          },
        );
      });
    });
  });
});
