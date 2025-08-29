import { InjectionToken, Provider } from '@nestjs/common';
import { ServiceClassProvider, ServiceValueProvider, ServiceFactoryProvider } from '../types/interfaces';

export class ProviderBuilder {
  public static build<T>(
    di: InjectionToken,
    params?: {
      providerType?: ServiceClassProvider<T> | ServiceValueProvider<T> | ServiceFactoryProvider<T>;
      defaultType?: ServiceClassProvider<T> | ServiceValueProvider<T> | ServiceFactoryProvider<T>;
    },
  ): Provider {
    if (params?.providerType) {
      return {
        provide: di,
        ...params.providerType,
      };
    }

    return {
      provide: di,
      ...params.defaultType,
    };
  }
}
