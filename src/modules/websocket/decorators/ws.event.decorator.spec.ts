/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { WsAuthGuard } from '../guards/ws.auth.guard';
import { WsEvent } from './ws.event.decorator';

jest.mock('src/modules/elk-logger', () => ({
  __esModule: true,
  TraceSpanHelper: {
    generateTraceId: jest.fn().mockReturnValue('gen-id'),
    generateSpanId: jest.fn().mockReturnValue('gen-span'),
  },
}));

describe('WsEvent Decorator', () => {
  it('должен успешно применить метаданные к методу класса при аннотации', () => {
    const testEvent = 'chatMessage';

    class TestGateway {
      @WsEvent(testEvent)
      public handleTestMessage(): void {}
    }

    const patternMetadata = Reflect.getMetadata('message', TestGateway.prototype.handleTestMessage);

    const guardsMetadata = Reflect.getMetadata('__guards__', TestGateway.prototype.handleTestMessage);

    expect(patternMetadata).toEqual(testEvent);

    expect(guardsMetadata).toBeDefined();
    expect(Array.isArray(guardsMetadata)).toBe(true);
    expect(guardsMetadata[0]).toBe(WsAuthGuard);
  });
});
