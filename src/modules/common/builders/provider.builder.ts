import { InjectionToken, Provider } from '@nestjs/common';
import { IServiceClassProvider, IServiceValueProvider, IServiceFactoryProvider } from '../types/interfaces';

export abstract class ProviderBuilder {
  public static build<T>(
    di: InjectionToken,
    params?: {
      providerType?: IServiceClassProvider<T> | IServiceValueProvider<T> | IServiceFactoryProvider<T>;
      defaultType?: IServiceClassProvider<T> | IServiceValueProvider<T> | IServiceFactoryProvider<T>;
    },
  ): Provider {
    if (params?.providerType) {
      return {
        provide: di,
        ...params.providerType,
      };
    }

    if (!params?.defaultType) {
      throw new Error(`ProviderBuilder: defaultType is not defined for ${di.toString()}`);
    }

    return {
      provide: di,
      ...params.defaultType,
    } as Provider;
  }
}
