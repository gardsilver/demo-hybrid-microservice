import 'reflect-metadata';
import { copyMetadata } from './reflect-metadata';

describe('copyMetadata', () => {
  it('should copy all metadata from source to target', () => {
    const source = () => undefined;
    const target = () => undefined;

    Reflect.defineMetadata('role', 'admin', source);
    Reflect.defineMetadata('version', 1, source);
    Reflect.defineMetadata('config', { enabled: true }, source);

    copyMetadata(target, source);

    expect(Reflect.getMetadata('role', target)).toBe('admin');
    expect(Reflect.getMetadata('version', target)).toBe(1);
    expect(Reflect.getMetadata('config', target)).toEqual({
      enabled: true,
    });
  });

  it('should not fail if source has no metadata', () => {
    const source = () => undefined;
    const target = () => undefined;

    expect(() => copyMetadata(target, source)).not.toThrow();

    expect(Reflect.getMetadataKeys(target)).toEqual([]);
  });

  it('should overwrite existing metadata on target', () => {
    const source = () => undefined;
    const target = () => undefined;

    Reflect.defineMetadata('role', 'user', target);
    Reflect.defineMetadata('role', 'admin', source);

    copyMetadata(target, source);

    expect(Reflect.getMetadata('role', target)).toBe('admin');
  });

  it('should copy symbol metadata keys', () => {
    const source = () => undefined;
    const target = () => undefined;

    const symbolKey = Symbol('test');

    Reflect.defineMetadata(symbolKey, 'symbol-value', source);

    copyMetadata(target, source);

    expect(Reflect.getMetadata(symbolKey, target)).toBe('symbol-value');
  });
});
