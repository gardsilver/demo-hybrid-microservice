import { IgnoreObjectsFactory } from '../ignore-objects.factory';

export abstract class IgnoreObjectsFactoryBuilder {
  public static build(): IgnoreObjectsFactory {
    return new IgnoreObjectsFactory();
  }
}
