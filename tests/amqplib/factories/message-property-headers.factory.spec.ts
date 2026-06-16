/* eslint-disable @typescript-eslint/no-explicit-any */
import { messagePropertyHeadersFactory } from './message-property-headers.factory';

describe('messagePropertyHeadersFactory', () => {
  it('должен возвращать пустой объект заголовков по умолчанию, если transientParams не передан', () => {
    const result = messagePropertyHeadersFactory.build();
    expect(result).toEqual({});
  });

  describe('Покрытие параметров x-first-death-*', () => {
    it('должен генерировать случайные строки силами faker, если параметры установлены в true', () => {
      const result = messagePropertyHeadersFactory.build(
        {},
        {
          transient: {
            firstDeathExchange: true,
            firstDeathQueue: true,
            firstDeathReason: true,
          } as any,
        },
      );

      expect(result['x-first-death-exchange']).toBeDefined();
      expect(typeof result['x-first-death-exchange']).toBe('string');

      expect(result['x-first-death-queue']).toBeDefined();
      expect(typeof result['x-first-death-queue']).toBe('string');

      expect(result['x-first-death-reason']).toBeDefined();
      expect(typeof result['x-first-death-reason']).toBe('string');
    });

    it('должен пробрасывать кастомные текстовые значения, если параметры переданы как строки', () => {
      const result = messagePropertyHeadersFactory.build(
        {},
        {
          transient: {
            firstDeathExchange: 'custom-exchange',
            firstDeathQueue: 'custom-queue',
            firstDeathReason: 'custom-reason',
          } as any,
        },
      );

      expect(result['x-first-death-exchange']).toBe('custom-exchange');
      expect(result['x-first-death-queue']).toBe('custom-queue');
      expect(result['x-first-death-reason']).toBe('custom-reason');
    });
  });

  describe('Покрытие параметров x-death (обработка Dead Letter Queue)', () => {
    it('должен генерировать дефолтный массив x-death со случайными полями, если флаг death равен true', () => {
      const result = messagePropertyHeadersFactory.build(
        {},
        {
          transient: {
            death: true,
          } as any,
        },
      );

      expect(Array.isArray(result['x-death'])).toBe(true);
      expect(result['x-death']).toHaveLength(1);

      const deathItem = (result['x-death'] as any[])[0];
      expect(deathItem.reason).toBe('rejected');
      expect(deathItem.time['!']).toBe('timestamp');
      expect(typeof deathItem.count).toBe('number');
      expect(typeof deathItem.queue).toBe('string');
      expect(typeof deathItem.exchange).toBe('string');
    });

    it('должен оборачивать одиночный кастомный объект x-death в массив, если передан не массив', () => {
      const mockSingleDeath = {
        count: 1,
        reason: 'expired',
        queue: 'my-dlq',
        time: { '!': 'timestamp', value: 12345 },
        exchange: 'my-exchange',
        'original-expiration': '1000',
        'routing-keys': ['key'],
      };

      const result = messagePropertyHeadersFactory.build(
        {},
        {
          transient: {
            death: mockSingleDeath, // Передаем одиночный объект
          } as any,
        },
      );

      expect(Array.isArray(result['x-death'])).toBe(true);
      expect(result['x-death']).toHaveLength(1);
      expect(result['x-death']).toEqual([mockSingleDeath]);
    });

    it('должен сохранять и пробрасывать массив объектов x-death без изменений, если передан готовый массив', () => {
      const mockDeathArray = [
        { count: 1, reason: 'rejected', queue: 'q1' },
        { count: 2, reason: 'expired', queue: 'q2' },
      ];

      const result = messagePropertyHeadersFactory.build(
        {},
        {
          transient: {
            death: mockDeathArray,
          } as any,
        },
      );

      expect(Array.isArray(result['x-death'])).toBe(true);
      expect(result['x-death']).toHaveLength(2);
      expect(result['x-death']).toEqual(mockDeathArray);
    });
  });
});
