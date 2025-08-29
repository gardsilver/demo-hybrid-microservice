import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';

export interface ITargetInstanceMethod<T> {
  instance: object;
  method: (() => void) | (() => Promise<void>);
  metadata: T;
}

@Injectable()
export class MetadataExplorer {
  constructor(
    private readonly discoveryService: DiscoveryService, // экспортируется из DiscoveryModule
    private readonly metadataScanner: MetadataScanner,
  ) {}

  public searchAllTargetInstanceMethod<T>(metadataKey: string): ITargetInstanceMethod<T>[] {
    const results: ITargetInstanceMethod<T>[] = [];

    this.discoveryService
      .getProviders()
      .filter((provider) => {
        return provider.instance;
      })
      .forEach((provider) => {
        if (typeof provider.instance === 'object') {
          this.metadataScanner.getAllMethodNames(provider.instance).forEach((methodName) => {
            const metadata = Reflect.getMetadata(metadataKey, provider.instance, methodName);

            if (metadata) {
              results.push({
                instance: provider.instance,
                method: provider.instance[methodName],
                metadata,
              });
            }
          });
        }
      });

    this.discoveryService
      .getControllers()
      .filter((provider) => {
        return provider.instance;
      })
      .forEach((provider) => {
        if (typeof provider.instance === 'object') {
          this.metadataScanner.getAllMethodNames(provider.instance).forEach((methodName) => {
            const metadata = Reflect.getMetadata(metadataKey, provider.instance, methodName);

            if (metadata) {
              results.push({
                instance: provider.instance,
                method: provider.instance[methodName],
                metadata,
              });
            }
          });
        }
      });

    return results;
  }
}
