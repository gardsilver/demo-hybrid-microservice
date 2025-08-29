import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { ConfigServiceHelper } from './config-service.helper';

describe(ConfigServiceHelper.name, () => {
  let spyError;
  let spyKeyName;
  let config: ConfigService;
  let helper: ConfigServiceHelper;

  beforeEach(async () => {
    config = new MockConfigService() as undefined as ConfigService;
    helper = new ConfigServiceHelper(config);

    spyError = jest.spyOn(ConfigServiceHelper.prototype, 'error');
    spyKeyName = jest.spyOn(ConfigServiceHelper.prototype, 'getKeyName');

    jest.clearAllMocks();
  });

  it('getKeyName', async () => {
    expect(helper.getKeyName('myKye')).toBe('myKye');

    helper = new ConfigServiceHelper(config, 'myPrefix_');

    expect(helper.getKeyName('myKye')).toBe('myPrefix_myKye');
  });

  it('error', async () => {
    expect(() => helper.error('myKye', '')).toThrow(new Error("Не корректно задан параметр: myKye=''."));
    expect(() => helper.error('myKye', 'myValue', "одно из значений ['yes', 'no']")).toThrow(
      new Error("Не корректно задан параметр: myKye='myValue'. Ожидается: одно из значений ['yes', 'no']."),
    );
  });

  it('parse default', async () => {
    expect({
      parseBoolean: helper.parseBoolean('bool'),
      parseInt: helper.parseInt('int', false),
      parseArray: helper.parseArray('array'),
    }).toEqual({
      parseBoolean: true,
      parseInt: false,
      parseArray: [],
    });

    expect({
      parseBoolean: helper.parseBoolean('bool', false),
    }).toEqual({
      parseBoolean: false,
    });
  });

  describe('parse bool', () => {
    it('success', async () => {
      config = new MockConfigService({
        bool: ' no ',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config);

      expect(helper.parseBoolean('bool')).toBeFalsy();
      expect(spyKeyName).toHaveBeenCalledWith('bool');

      config = new MockConfigService({
        bool: 'No',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config);

      expect(helper.parseBoolean('bool')).toBeFalsy();

      expect(spyError).toHaveBeenCalledTimes(0);
    });

    it('failed', async () => {
      config = new MockConfigService({
        prefix_bool: 'anyValue',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config, 'prefix_');

      let result;
      let exception;
      try {
        result = helper.parseBoolean('bool');
      } catch (e) {
        exception = e;
      }

      expect(result).toBeUndefined();
      expect(exception).toBeDefined();
      expect(spyError).toHaveBeenCalledWith('prefix_bool', 'anyvalue', "одно из значений ['yes', 'no']");
    });
  });

  describe('parse parseInt', () => {
    it('success', async () => {
      config = new MockConfigService({
        int: ' 12345 ',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config);

      expect(helper.parseInt('int', undefined)).toBe(12345);
      expect(spyKeyName).toHaveBeenCalledWith('int');

      config = new MockConfigService({
        int: '12345',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config);

      expect(helper.parseInt('int', undefined)).toBe(12345);
      expect(spyError).toHaveBeenCalledTimes(0);
    });

    it('failed', async () => {
      config = new MockConfigService({
        prefix_int: 'abc15e-12345 abc',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config, 'prefix_');

      let result;
      let exception;
      try {
        result = helper.parseInt('int', undefined);
      } catch (e) {
        exception = e;
      }

      expect(result).toBeUndefined();
      expect(exception).toBeDefined();
      expect(spyError).toHaveBeenCalledWith('prefix_int', 'abc15e-12345 abc');
    });
  });

  describe('parse parseArray', () => {
    it('success', async () => {
      config = new MockConfigService({
        array: ' 12345 weqr34    546 756 2345',
      }) as undefined as ConfigService;
      helper = new ConfigServiceHelper(config);

      expect(helper.parseArray('array')).toEqual(['12345 weqr34    546 756 2345']);
      expect(helper.parseArray('array', ' ')).toEqual(['12345', 'weqr34', '546', '756', '2345']);

      expect(spyError).toHaveBeenCalledTimes(0);
    });
  });
});
