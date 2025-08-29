// eslint-disable-next-line @typescript-eslint/no-require-imports
import Long = require('long');
import { enumKeys, enumValues, isStaticMethod, moneyToKopecks } from './normalizers';

describe('Normalizers', () => {
  it(moneyToKopecks.name, async () => {
    expect(
      moneyToKopecks({
        currencyCode: 'RU',
        units: Long.fromValue(7),
        nanos: 5_000_000_000,
      }).toString(),
    ).toBe('1200');
  });

  describe('isStaticMethod', () => {
    class MySuperClass {
      public static staticMethod() {}
      public instanceMethod() {}
    }

    class MyClass extends MySuperClass {}

    it('Проверяем, что в классе определен статический метод', async () => {
      expect(isStaticMethod(MySuperClass, 'staticMethod')).toBeTruthy();
      expect(isStaticMethod(MySuperClass.prototype, 'staticMethod')).toBeFalsy();
      expect(isStaticMethod(MySuperClass.prototype, 'instanceMethod')).toBeTruthy();
      expect(isStaticMethod(MySuperClass, 'instanceMethod')).toBeFalsy();
      expect(isStaticMethod(null, 'instanceMethod')).toBeFalsy();
      expect(isStaticMethod(undefined, 'instanceMethod')).toBeFalsy();
    });

    it('Проверяем, что при наследовании так же определен статический метод', async () => {
      expect(isStaticMethod(MyClass, 'staticMethod')).toBeTruthy();
      expect(isStaticMethod(MyClass.prototype, 'staticMethod')).toBeFalsy();
      expect(isStaticMethod(MyClass.prototype, 'instanceMethod')).toBeTruthy();
      expect(isStaticMethod(MyClass, 'instanceMethod')).toBeFalsy();
    });
  });

  describe('Enums', () => {
    enum TestEnumAsNumber {
      A,
      B,
      C,
    }

    enum TestEnumAsString {
      A = 'a',
      B = 'b',
      C = 'c',
    }

    it('enumKeys', async () => {
      expect(enumKeys(TestEnumAsNumber)).toEqual(['A', 'B', 'C']);
      expect(enumKeys(TestEnumAsString)).toEqual(['A', 'B', 'C']);
    });

    it('enumValues', async () => {
      expect(enumValues(TestEnumAsNumber)).toEqual([0, 1, 2]);
      expect(enumValues(TestEnumAsString)).toEqual(['a', 'b', 'c']);
    });
  });
});
