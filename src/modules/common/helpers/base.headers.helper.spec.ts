import { faker } from '@faker-js/faker';
import { IHeaders, IKeyValue } from '../types/types';
import { BaseHeadersHelper } from './base.headers.helper';

type HeaderValue = string | number | Buffer;
type RawHeaders = IKeyValue<HeaderValue | HeaderValue[] | undefined>;

describe(BaseHeadersHelper.name, () => {
  let traceId: string;
  let spanId: string;
  let rawHeaders: RawHeaders;

  beforeEach(async () => {
    traceId = faker.string.uuid();
    spanId = faker.string.uuid();

    rawHeaders = {
      'x-trace-id': traceId,
      'bin-span-id': [Buffer.from(spanId, 'utf8')],
      'program-ids': [10, 32],
      empty: undefined,
      'empty-string': '',
      'empty-array': [],
    };
  });

  it('normalize', async () => {
    expect(BaseHeadersHelper.normalize(rawHeaders)).toEqual({
      'x-trace-id': traceId,
      'bin-span-id': [spanId],
      'program-ids': ['10', '32'],
      'empty-array': [],
      'empty-string': '',
    });
  });

  describe('searchValue', () => {
    it('должен успешно находить заголовок, если он передан как строка', () => {
      const headers: IHeaders = {
        'x-trace-id': 'test-trace-id-value',
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-trace-id');

      expect(result).toEqual({
        header: 'x-trace-id',
        value: 'test-trace-id-value',
      });
    });

    it('должен возвращать undefined для value, если заголовок является пустой базовой строкой', () => {
      const headers: IHeaders = {
        'x-trace-id': '',
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-trace-id');

      expect(result).toEqual({
        header: 'x-trace-id',
        value: undefined,
      });
    });

    it('должен успешно находить заголовок, если он передан как заполненный массив строк', () => {
      const headers: IHeaders = {
        'x-request-id': ['req-1', 'req-2'],
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-request-id');

      expect(result).toEqual({
        header: 'x-request-id',
        value: ['req-1', 'req-2'],
      });
    });

    it('должен возвращать undefined для value, если заголовок является пустым массивом', () => {
      const headers: IHeaders = {
        'x-request-id': [],
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-request-id');

      expect(result).toEqual({
        header: 'x-request-id',
        value: undefined,
      });
    });

    it('должен возвращать структуру с undefined, если искомых заголовков нет в объекте', () => {
      const headers: IHeaders = {
        'content-type': 'application/json',
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-trace-id', 'x-span-id');

      expect(result).toEqual({
        header: undefined,
        value: undefined,
      });
    });

    it('должен возвращать первый найденный заголовок из списка альтернатив (мульти-поиск)', () => {
      const headers: IHeaders = {
        'x-alt-trace-id': 'alt-value',
        'x-trace-id': 'primary-value',
      };

      // 'x-trace-id' идет вторым аргументом, но в объекте headers присутствуют оба.
      // reduce должен зафиксировать первый встреченный из списка headerName, у которого значение не undefined.
      const result = BaseHeadersHelper.searchValue(headers, 'x-trace-id', 'x-alt-trace-id');

      expect(result).toEqual({
        header: 'x-trace-id',
        value: 'primary-value',
      });
    });

    it('должен пропускать первый заголовок, если его нет в объекте, и успешно возвращать второй', () => {
      const headers: IHeaders = {
        'x-alt-trace-id': 'alt-only-value',
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-trace-id', 'x-alt-trace-id');

      expect(result).toEqual({
        header: 'x-alt-trace-id',
        value: 'alt-only-value',
      });
    });

    it('должен останавливать итерации reduce, как только валидное значение найдено', () => {
      const headers: IHeaders = {
        'x-trace-id': 'found-value',
        'x-span-id': 'should-be-ignored-by-reduce',
      };

      const result = BaseHeadersHelper.searchValue(headers, 'x-trace-id', 'x-span-id');

      // На первом шаге нашли x-trace-id, шаг с x-span-id не должен перетереть результат
      expect(result).toEqual({
        header: 'x-trace-id',
        value: 'found-value',
      });
    });
  });

  describe('searchHeaderAsString', () => {
    it('должен успешно находить заголовок и возвращать его значение, если это простая строка', () => {
      const headers: IHeaders = {
        'x-trace-id': 'single-trace-string-value',
      };

      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-trace-id');

      expect(result).toBe('single-trace-string-value');
    });

    it('должен склеивать элементы массива через дефис, если заголовок является заполненным массивом строк', () => {
      const headers: IHeaders = {
        'x-request-id': ['part-one', 'part-two', 'part-three'],
      };

      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-request-id');

      // Проверяем работу ветки Array.isArray(result.value) -> result.value.join('-')
      expect(result).toBe('part-one-part-two-part-three');
    });

    it('должен возвращать undefined, если заголовок является пустым массивом', () => {
      const headers: IHeaders = {
        'x-request-id': [],
      };

      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-request-id');

      expect(result).toBeUndefined();
    });

    it('должен возвращать undefined, если заголовок является пустой строкой', () => {
      const headers: IHeaders = {
        'x-trace-id': '',
      };

      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-trace-id');

      expect(result).toBeUndefined();
    });

    it('должен возвращать undefined, если искомых заголовков вообще нет в объекте', () => {
      const headers: IHeaders = {
        'content-type': 'application/json',
      };

      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-trace-id', 'x-span-id');

      expect(result).toBeUndefined();
    });

    it('должен корректно обрабатывать мульти-поиск альтернативных имен и возвращать первый найденный результат в виде строки', () => {
      const headers: IHeaders = {
        'x-alt-trace-id': ['array', 'id'],
        'x-trace-id': 'primary-string-id',
      };

      // 'x-trace-id' идет первым в списке, reduce найдет его, метод вернет чистую строку
      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-trace-id', 'x-alt-trace-id');
      expect(result).toBe('primary-string-id');

      // Если поменяем приоритет поиска местами — должен найти массив и склеить его
      const resultAlt = BaseHeadersHelper.searchHeaderAsString(headers, 'x-alt-trace-id', 'x-trace-id');
      expect(resultAlt).toBe('array-id');
    });

    it('должен пропускать первый заголовок, если его нет в объекте, и успешно преобразовывать и возвращать второй', () => {
      const headers: IHeaders = {
        'x-alt-span-id': ['span', 'batch', 'part'],
      };

      const result = BaseHeadersHelper.searchHeaderAsString(headers, 'x-span-id', 'x-alt-span-id');

      expect(result).toBe('span-batch-part');
    });
  });
});
