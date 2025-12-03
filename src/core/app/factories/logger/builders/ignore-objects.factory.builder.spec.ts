import { IgnoreObjectsFactoryBuilder } from './ignore-objects.factory.builder';
import { IgnoreObjectsFactory } from '../ignore-objects.factory';

describe(IgnoreObjectsFactoryBuilder.name, () => {
  it('build', async () => {
    const service = IgnoreObjectsFactoryBuilder.build();

    expect(service instanceof IgnoreObjectsFactory).toBeTruthy();

    expect(service.getCheckObjects()).toEqual([]);
  });
});
