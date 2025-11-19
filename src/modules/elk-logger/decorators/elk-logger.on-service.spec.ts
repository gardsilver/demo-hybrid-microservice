import { faker } from '@faker-js/faker';
import { ILogFields } from '../types/elk-logger.types';
import { ElkLoggerOnService, getElkLoggerOptions } from './elk-logger.on-service';

describe(ElkLoggerOnService.name, () => {
  let defaultFields: ILogFields;

  beforeEach(async () => {
    defaultFields = {
      module: faker.string.alpha(5),
    };
  });

  it('default', async () => {
    class TestEmptyService {}

    @ElkLoggerOnService({
      fields: defaultFields,
    })
    class TestService {}

    @ElkLoggerOnService({
      fields: () => defaultFields,
    })
    class TestServiceAsFunc {}

    const serviceEmpty = new TestEmptyService();
    const service = new TestService();
    const serviceFunc = new TestServiceAsFunc();

    let params = getElkLoggerOptions(serviceEmpty);

    expect(params).toEqual({
      fields: false,
    });

    params = getElkLoggerOptions(service);

    expect(params).toEqual({
      fields: defaultFields,
    });

    params = getElkLoggerOptions(serviceFunc);

    expect(params).toEqual({
      fields: defaultFields,
    });
  });
});
