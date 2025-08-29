import { ProviderBuilder } from './provider.builder';

class TestProvide {}

describe(ProviderBuilder.name, () => {
  describe('build', () => {
    it('default', async () => {
      let exception = false;
      let provide;

      try {
        provide = ProviderBuilder.build('test_di');
      } catch {
        exception = true;
      }
      expect(provide).toBeUndefined();
      expect(exception).toBeTruthy();

      provide = ProviderBuilder.build('test_di', {
        defaultType: { useValue: [] },
      });

      expect(provide).toEqual({
        provide: 'test_di',
        useValue: [],
      });
    });

    it('useFactory', async () => {
      const useFactory = () => {
        return new TestProvide();
      };

      let provide = ProviderBuilder.build('test_di', {
        providerType: {
          useFactory,
        },
      });

      expect(provide).toEqual({
        provide: 'test_di',
        useFactory,
      });

      provide = ProviderBuilder.build('test_di', {
        providerType: {
          useFactory,
          inject: [],
        },
      });

      expect(provide).toEqual({
        provide: 'test_di',
        useFactory,
        inject: [],
      });

      provide = ProviderBuilder.build('test_di', {
        providerType: {
          useFactory,
          inject: [TestProvide],
        },
      });

      expect(provide).toEqual({
        provide: 'test_di',
        useFactory,
        inject: [TestProvide],
      });
    });

    it('useValue', async () => {
      const useValue = new TestProvide();

      const provide = ProviderBuilder.build('test_di', {
        providerType: {
          useValue,
        },
      });

      expect(provide).toEqual({
        provide: 'test_di',
        useValue,
      });
    });
  });
});
