import { UrlHelper } from './url.helper';

describe(UrlHelper.name, () => {
  describe('normalize', () => {
    it('http default', async () => {
      expect(UrlHelper.normalize('http://test.ru/path')).toEqual('test.ru:80');
    });

    it('http custom', async () => {
      expect(UrlHelper.normalize('http://test.ru:300/path')).toEqual('test.ru:300');
    });

    it('https default', async () => {
      expect(UrlHelper.normalize('https://test.ru/path')).toEqual('test.ru:443');
    });

    it('https custom', async () => {
      expect(UrlHelper.normalize('https://test.ru:300/path')).toEqual('test.ru:300');
    });

    it('undefined format', async () => {
      expect(UrlHelper.normalize('test.ru:300/path')).toBeFalsy();
      expect(UrlHelper.normalize('test.ru:300')).toBeFalsy();
      expect(UrlHelper.normalize('test.ru')).toBeFalsy();
    });
  });

  describe('parse', () => {
    it('http default', async () => {
      expect(UrlHelper.parse('http://test.ru/path')).toEqual({
        hostname: 'test.ru:80',
        pathname: '/path',
      });

      expect(UrlHelper.parse('http://test.ru')).toEqual({
        hostname: 'test.ru:80',
        pathname: '/',
      });
    });

    it('http custom', async () => {
      expect(UrlHelper.parse('http://test.ru:300/path')).toEqual({
        hostname: 'test.ru:300',
        pathname: '/path',
      });

      expect(UrlHelper.parse('http://test.ru:300')).toEqual({
        hostname: 'test.ru:300',
        pathname: '/',
      });
    });

    it('https default', async () => {
      expect(UrlHelper.parse('https://test.ru/path')).toEqual({
        hostname: 'test.ru:443',
        pathname: '/path',
      });

      expect(UrlHelper.parse('https://test.ru')).toEqual({
        hostname: 'test.ru:443',
        pathname: '/',
      });
    });

    it('https custom', async () => {
      expect(UrlHelper.parse('https://test.ru:300/path')).toEqual({
        hostname: 'test.ru:300',
        pathname: '/path',
      });

      expect(UrlHelper.parse('https://test.ru:300')).toEqual({
        hostname: 'test.ru:300',
        pathname: '/',
      });
    });

    it('undefined format', async () => {
      expect(() => UrlHelper.parse('test.ru:300/path')).toThrow(
        new Error('Не корректный формат URI (test.ru:300/path)'),
      );
      expect(() => UrlHelper.parse('test.ru:300')).toThrow(new Error('Не корректный формат URI (test.ru:300)'));
      expect(() => UrlHelper.parse('test.ru')).toThrow(new Error('Не корректный формат URI (test.ru)'));
    });
  });
});
