/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { ElkLoggerEventService } from '../services/elk-logger.event-service';
import { ElkLoggerOnMethod } from './elk-logger.on-method';
import { ElkLoggerOnService } from './elk-logger.on-service';
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

  describe('with ElkLoggerOnService', () => {
    @ElkLoggerOnService({
      fields: {
        module: 'CustomService',
      },
    })
    class TestService {
      @ElkLoggerOnMethod({
        fields: {
          markers: ['custom'],
        },
        before: true,
        after: true,
        throw: true,
        finally: true,
      })
      run(status: string) {
        return status;
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
        service: 'TestService',
        method: 'run',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('default', async () => {
      let result = undefined;

      result = service.run('success');

      expect(result).toBe('success');

      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          fields: {
            module: 'CustomService',
            markers: ['custom'],
            businessData: {},
            payload: {},
          },
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
          fields: {
            module: 'CustomService',
            markers: ['custom'],
            businessData: {},
            payload: {},
          },
          data: {
            payload: {
              duration: 20,
              result,
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          fields: {
            module: 'CustomService',
            markers: ['custom'],
            businessData: {},
            payload: {},
          },
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });
  });

  describe('default no async as empty', () => {
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });
  });

  describe('default no async as true', () => {
    class TestService {
      @ElkLoggerOnMethod({
        before: true,
        after: true,
        throw: true,
        finally: true,
      })
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        before: true,
        after: true,
        throw: true,
        finally: true,
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
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
        finally: false,
      })
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: () => fields,
        before: () => false,
        after: () => false,
        throw: () => false,
        finally: () => false,
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.AFTER_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.THROW_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });
  });

  describe('custom no async as function', () => {
    let spyFields;
    let spyBefore;
    let spyAfter;
    let spyThrow;
    let spyFinally;

    beforeAll(async () => {
      spyFields = jest.fn().mockImplementation(() => fields);
      spyBefore = jest.fn();
      spyAfter = jest.fn();
      spyThrow = jest.fn();
      spyFinally = jest.fn();
    });

    class TestService {
      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
        finally: (args) => spyFinally(args),
      })
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
        finally: (args) => spyFinally(args),
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ service: 'TestService', method: 'runOk', methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ service: 'TestService', method: 'runOk', methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(1);
      expect(spyAfter).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runOk',
        result,
        duration: 20,
        methodsArgs: ['success'],
      });

      expect(spyThrow).toHaveBeenCalledTimes(0);

      expect(spyFinally).toHaveBeenCalledTimes(1);
      expect(spyFinally).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runOk',
        duration: 20,
        methodsArgs: ['success'],
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ service: 'TestService', method: 'runError', methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ service: 'TestService', method: 'runError', methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(0);

      expect(spyThrow).toHaveBeenCalledTimes(1);
      expect(spyThrow).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runError',
        error: result,
        duration: 20,
        methodsArgs: ['success'],
      });

      expect(spyFinally).toHaveBeenCalledTimes(1);
      expect(spyFinally).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runError',
        duration: 20,
        methodsArgs: ['success'],
      });
    });
  });

  describe('custom no async as object', () => {
    class TestService {
      @ElkLoggerOnMethod({
        fields: {
          module: 'Custom module',
        },
        before: {
          message: 'before',
        },
        after: {
          message: 'after',
        },
        throw: {
          message: 'throw',
        },
        finally: {
          message: 'finally',
        },
      })
      runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: {
          module: 'Custom module',
        },
        before: {
          message: 'before',
        },
        after: {
          message: 'after',
        },
        throw: {
          message: 'throw',
        },
        finally: {
          message: 'finally',
        },
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          message: 'before',
          fields: {
            module: 'Custom module',
          },
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
          message: 'after',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
              result,
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          message: 'finally',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          message: 'before',
          fields: {
            module: 'Custom module',
          },
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
          message: 'throw',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
              error: mockError,
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          message: 'finally',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });
  });

  describe('default async as empty', () => {
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });
  });

  describe('default async as true', () => {
    class TestService {
      @ElkLoggerOnMethod({
        before: true,
        after: true,
        throw: true,
        finally: true,
      })
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        before: true,
        after: true,
        throw: true,
        finally: true,
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
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

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          fields: {},
          data: {
            payload: {
              duration: 20,
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
        finally: false,
      })
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: () => fields,
        before: () => false,
        after: () => false,
        throw: () => false,
        finally: () => false,
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.AFTER_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.THROW_CALL, {
        ...params,
        loggerPrams: false,
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: false,
      });
    });
  });

  describe('custom async as function', () => {
    let spyFields;
    let spyBefore;
    let spyAfter;
    let spyThrow;
    let spyFinally;

    beforeAll(async () => {
      spyFields = jest.fn().mockImplementation(() => fields);
      spyBefore = jest.fn();
      spyAfter = jest.fn();
      spyThrow = jest.fn();
      spyFinally = jest.fn();
    });

    class TestService {
      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
        finally: (args) => spyFinally(args),
      })
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: (args) => spyFields(args),
        before: (args) => spyBefore(args),
        after: (args) => spyAfter(args),
        throw: (args) => spyThrow(args),
        finally: (args) => spyFinally(args),
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ service: 'TestService', method: 'runOk', methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ service: 'TestService', method: 'runOk', methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(1);
      expect(spyAfter).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runOk',
        result,
        duration: 20,
        methodsArgs: ['success'],
      });

      expect(spyThrow).toHaveBeenCalledTimes(0);

      expect(spyFinally).toHaveBeenCalledTimes(1);
      expect(spyFinally).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runOk',
        duration: 20,
        methodsArgs: ['success'],
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);

      expect(spyFields).toHaveBeenCalledTimes(1);
      expect(spyFields).toHaveBeenCalledWith({ service: 'TestService', method: 'runError', methodsArgs: ['success'] });

      expect(spyBefore).toHaveBeenCalledTimes(1);
      expect(spyBefore).toHaveBeenCalledWith({ service: 'TestService', method: 'runError', methodsArgs: ['success'] });

      expect(spyAfter).toHaveBeenCalledTimes(0);

      expect(spyThrow).toHaveBeenCalledTimes(1);
      expect(spyThrow).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runError',
        error: result,
        duration: 20,
        methodsArgs: ['success'],
      });

      expect(spyFinally).toHaveBeenCalledTimes(1);
      expect(spyFinally).toHaveBeenCalledWith({
        service: 'TestService',
        method: 'runError',
        duration: 20,
        methodsArgs: ['success'],
      });
    });
  });

  // ====================
  describe('custom async as object', () => {
    class TestService {
      @ElkLoggerOnMethod({
        fields: {
          module: 'Custom module',
        },
        before: {
          message: 'before',
        },
        after: {
          message: 'after',
        },
        throw: {
          message: 'throw',
        },
        finally: {
          message: 'finally',
        },
      })
      async runOk(status: string) {
        return status;
      }

      @ElkLoggerOnMethod({
        fields: {
          module: 'Custom module',
        },
        before: {
          message: 'before',
        },
        after: {
          message: 'after',
        },
        throw: {
          message: 'throw',
        },
        finally: {
          message: 'finally',
        },
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
        service: 'TestService',
        method: 'runOk',
        context: mockContext,
        loggerPrams: false,
      };
    });

    it('success', async () => {
      let result = undefined;

      result = await service.runOk('success');

      expect(result).toBe('success');
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          message: 'before',
          fields: {
            module: 'Custom module',
          },
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
          message: 'after',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
              result,
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          message: 'finally',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });

    it('failed', async () => {
      params.method = 'runError';

      let result = undefined;

      try {
        result = await service.runError('success');
      } catch (error) {
        result = error;
      }

      expect(result).toEqual(mockError);
      expect(spyEmit).toHaveBeenCalledTimes(3);
      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.BEFORE_CALL, {
        ...params,
        loggerPrams: {
          message: 'before',
          fields: {
            module: 'Custom module',
          },
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
          message: 'throw',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
              error: mockError,
            },
          },
        },
      });

      expect(spyEmit).toHaveBeenCalledWith(IElkLoggerEvent.FINALLY_CALL, {
        ...params,
        loggerPrams: {
          message: 'finally',
          fields: {
            module: 'Custom module',
          },
          data: {
            payload: {
              duration: 20,
            },
          },
        },
      });
    });
  });
});
