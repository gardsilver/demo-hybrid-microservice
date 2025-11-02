/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { ElkLoggerEventService } from '../services/elk-logger.event-service';
import { ElkLoggerOnMethod } from './elk-logger.on-method';
import { IElkLoggerEvent, ITargetLoggerOnMethod } from '../types/decorators.type';
import { TraceSpanBuilder } from '../builders/trace-span.builder';
import { ILogFields } from '../types/elk-logger.types';

describe(ElkLoggerOnMethod.name, () => {
  let mockContext: IGeneralAsyncContext;
  let spyEmit;
  let mockError;
  let fields: ILogFields;

  beforeEach(async () => {
    spyEmit = jest.fn();

    mockError = new Error('Test error');

    mockContext = {
      ...TraceSpanBuilder.build(),
    };

    jest.spyOn(DateTimestamp.prototype, 'diff').mockImplementation(() => 20_000);

    fields = {
      index: 'TestApplications',
      markers: ['request'],
      module: 'TestService.run',
      businessData: {
        subModule: 'SubModule',
      },
    } as ILogFields;

    jest.spyOn(GeneralAsyncContext.instance, 'extend').mockImplementation(() => mockContext);

    ElkLoggerEventService['emit'] = spyEmit;

    jest.clearAllMocks();
  });

  describe('default no async', () => {
    class TestService {
      @ElkLoggerOnMethod({})
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({})
      runError(status: string) {
        throw mockError;
      }
    }

    let service: TestService;
    let params: ITargetLoggerOnMethod;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TestService],
      }).compile();

      service = module.get(TestService);

      params = {
        instanceName: 'TestService',
        methodName: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              args: ['success'],
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.AFTER_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
              result,
            },
          },
        },
      });
    });

    it('filed', async () => {
      params.methodName = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              args: ['success'],
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.THROW_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
              error: mockError,
            },
          },
        },
      });
    });
  });

  describe('skip no async', () => {
    class TestService {
      @ElkLoggerOnMethod({
        fields,
        before: false,
        after: false,
        throw: false,
      })
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: () => fields,
        before: () => false,
        after: () => false,
        throw: () => false,
      })
      runError(status: string) {
        throw mockError;
      }
    }

    let service: TestService;
    let params: ITargetLoggerOnMethod;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TestService],
      }).compile();

      service = module.get(TestService);

      params = {
        instanceName: 'TestService',
        methodName: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.AFTER_CALL, {
        ...params,
        loggerPrams: false,
      });
    });

    it('filed', async () => {
      params.methodName = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.THROW_CALL, {
        ...params,
        loggerPrams: false,
      });
    });
  });

  describe('custom no async', () => {
    let spyFields;
    let spyBefore;
    let spyAfter;
    let spyThrow;

    beforeAll(async () => {
      spyFields = jest.fn().mockImplementation(() => fields);
      spyBefore = jest.fn();
      spyAfter = jest.fn();
      spyThrow = jest.fn();
    });

    class TestService {
      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
      })
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
      })
      runError(status: string) {
        throw mockError;
      }
    }

    let service: TestService;
    let params: ITargetLoggerOnMethod;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TestService],
      }).compile();

      service = module.get(TestService);

      params = {
        instanceName: 'TestService',
        methodName: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ fields, methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(1);
      expect(spyAfter).toHaveBeenCalledWith({ result, duration: 20, fields, methodsArgs: ['success'] });

      expect(spyThrow).toHaveBeenCalledTimes(0);
    });

    it('filed', async () => {
      params.methodName = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ fields, methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(0);

      expect(spyThrow).toHaveBeenCalledTimes(1);
      expect(spyThrow).toHaveBeenCalledWith({ error: result, duration: 20, fields, methodsArgs: ['success'] });
    });
  });

  describe('default async', () => {
    class TestService {
      @ElkLoggerOnMethod({})
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({})
      async runError(status: string) {
        throw mockError;
      }
    }

    let service: TestService;
    let params: ITargetLoggerOnMethod;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TestService],
      }).compile();

      service = module.get(TestService);

      params = {
        instanceName: 'TestService',
        methodName: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              args: ['success'],
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.AFTER_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
              result,
            },
          },
        },
      });
    });

    it('filed', async () => {
      params.methodName = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              args: ['success'],
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.THROW_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
              error: mockError,
            },
          },
        },
      });
    });
  });

  describe('skip async', () => {
    class TestService {
      @ElkLoggerOnMethod({
        fields,
        before: false,
        after: false,
        throw: false,
      })
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: () => fields,
        before: () => false,
        after: () => false,
        throw: () => false,
      })
      async runError(status: string) {
        throw mockError;
      }
    }

    let service: TestService;
    let params: ITargetLoggerOnMethod;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TestService],
      }).compile();

      service = module.get(TestService);

      params = {
        instanceName: 'TestService',
        methodName: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.AFTER_CALL, {
        ...params,
        loggerPrams: false,
      });
    });

    it('filed', async () => {
      params.methodName = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(2);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.THROW_CALL, {
        ...params,
        loggerPrams: false,
      });
    });
  });

  describe('custom async', () => {
    let spyFields;
    let spyBefore;
    let spyAfter;
    let spyThrow;

    beforeAll(async () => {
      spyFields = jest.fn().mockImplementation(() => fields);
      spyBefore = jest.fn();
      spyAfter = jest.fn();
      spyThrow = jest.fn();
    });

    class TestService {
      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
      })
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
      })
      async runError(status: string) {
        throw mockError;
      }
    }

    let service: TestService;
    let params: ITargetLoggerOnMethod;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [TestService],
      }).compile();

      service = module.get(TestService);

      params = {
        instanceName: 'TestService',
        methodName: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ fields, methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(1);
      expect(spyAfter).toHaveBeenCalledWith({ result, duration: 20, fields, methodsArgs: ['success'] });

      expect(spyThrow).toHaveBeenCalledTimes(0);
    });

    it('filed', async () => {
      params.methodName = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ fields, methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(0);

      expect(spyThrow).toHaveBeenCalledTimes(1);
      expect(spyThrow).toHaveBeenCalledWith({ error: result, duration: 20, fields, methodsArgs: ['success'] });
    });
  });
});
