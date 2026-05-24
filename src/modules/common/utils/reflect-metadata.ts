/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

/**
 * Копирует все метаданные с оригинального метода на новый (обертку).
 */
export function copyMetadata(target: any, source: any): void {
  const metadataKeys = Reflect.getMetadataKeys(source);
  for (const key of metadataKeys) {
    const metadataValue = Reflect.getMetadata(key, source);
    Reflect.defineMetadata(key, metadataValue, target);
  }
}
