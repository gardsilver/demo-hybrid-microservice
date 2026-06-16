import { BaseHeadersHelper } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { grpcHeadersFactory, grpcMetadataFactory } from 'tests/modules/grpc/grpc-common';
import { GrpcHeadersHelper } from './grpc.headers.helper';

describe(GrpcHeadersHelper.name, () => {
  it('normalize', async () => {
    const headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
          asArray: true,
        },
      },
    );

    const grpcHeadersRaw = grpcHeadersFactory.build(headers);

    const metadata = grpcMetadataFactory.build(headers);
    const metadataRaw = grpcMetadataFactory.build(grpcHeadersRaw);

    expect(metadata.getMap()).toEqual(metadataRaw.getMap());
    expect(GrpcHeadersHelper.normalize(metadata.getMap())).toEqual(BaseHeadersHelper.normalize(headers));
    expect(GrpcHeadersHelper.normalize(metadataRaw.getMap())).toEqual(BaseHeadersHelper.normalize(headers));
  });

  describe('GrpcHeadersHelper.parsePattern', () => {
    describe('Парсинг объектов паттерна (NestJS JSON-структуры)', () => {
      it('должен успешно парсить структуру с ключами "service" и "rpc" (Твой текущий рантайм)', () => {
        const mockPattern = {
          service: 'MainService',
          rpc: 'find',
          streaming: 'no_stream',
        };

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('MainService/find');
      });

      it('должен поддерживать альтернативные ключи "rpcServices" и "method" (Старые/другие версии NestJS)', () => {
        const mockPattern = {
          rpcServices: 'OrderService',
          method: 'createOrder',
        };

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('OrderService/createOrder');
      });

      it('должен возвращать "Unknown/Unknown", если передан пустой объект или отсутствуют целевые свойства', () => {
        const mockPattern = {
          someRandomKey: 'some-value',
        };

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('Unknown/Unknown');
      });

      it('должен подставлять частичный "Unknown", если найдено только имя сервиса, но не метода', () => {
        const mockPattern = {
          service: 'BillingService',
        };

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('BillingService/Unknown');
      });
    });

    describe('Парсинг строковых паттернов (Нативные пути gRPC)', () => {
      it('должен успешно извлекать сервис и метод из полного сетевого gRPC-пути со слэшами', () => {
        const mockPattern = '/demo.service.MainService/find';

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('demo.service.MainService/find');
      });

      it('должен возвращать всю строку в качестве метода, если передан плоский текст без слэшей', () => {
        const mockPattern = 'IsolatedRpcMethod';

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('Unknown/IsolatedRpcMethod');
      });

      it('должен корректно обрабатывать крайние случаи со слэшами на границах строк', () => {
        const mockPattern = '/OnlyMethod';

        const result = GrpcHeadersHelper.parsePattern(mockPattern);

        expect(result).toBe('Unknown/OnlyMethod');
      });
    });

    describe('Пограничные кейсы типов данных', () => {
      it('должен безопасно приводить к строке и обрабатывать примитивы (числа/булевы), если они переданы вместо паттерна', () => {
        expect(GrpcHeadersHelper.parsePattern(12345)).toBe('Unknown/12345');
        expect(GrpcHeadersHelper.parsePattern(true)).toBe('Unknown/true');
      });

      it('должен возвращать "Unknown/Unknown" для null или undefined', () => {
        expect(GrpcHeadersHelper.parsePattern(null)).toBe('Unknown/Unknown');
        expect(GrpcHeadersHelper.parsePattern(undefined)).toBe('Unknown/Unknown');
      });
    });
  });
});
