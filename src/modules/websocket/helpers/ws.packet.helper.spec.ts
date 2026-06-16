import { WsPacketHelper } from './ws.packet.helper';

describe('WsPacketHelper', () => {
  describe('getEventName', () => {
    it('должен успешно вернуть имя события из классического массива Socket.io', () => {
      const packet = ['askMessage', { text: 'hello' }];
      expect(WsPacketHelper.getEventName(packet)).toBe('askMessage');
    });

    it('должен вернуть имя события, если пакет передан как плоская строка', () => {
      expect(WsPacketHelper.getEventName('justEventName')).toBe('justEventName');
    });

    it('должен вернуть undefined для невалидных типов, пустых строк или пустых массивов', () => {
      expect(WsPacketHelper.getEventName([])).toBeUndefined();
      expect(WsPacketHelper.getEventName('')).toBeUndefined();
      expect(WsPacketHelper.getEventName(null)).toBeUndefined();
      expect(WsPacketHelper.getEventName({ service: 'test' })).toBeUndefined();
    });
  });

  describe('getPayload', () => {
    it('должен успешно извлекать объект данных сообщения (packet[1])', () => {
      const mockPayload = { email: 'test@test.ru', text: 'Hi' };
      const packet = ['askMessage', mockPayload, () => {}];

      expect(WsPacketHelper.getPayload(packet)).toEqual(mockPayload);
    });

    it('должен вернуть undefined, если в пакете нет данных (только имя события и ack)', () => {
      const packet = ['ping', () => {}];
      expect(WsPacketHelper.getPayload(packet)).toBeUndefined();
    });

    it('должен вернуть undefined для пустых или не-массивных структур', () => {
      expect(WsPacketHelper.getPayload(['onlyEvent'])).toBeUndefined();
      expect(WsPacketHelper.getPayload('string-packet')).toBeUndefined();
    });
  });

  describe('getAckCallback', () => {
    it('должен успешно находить и возвращать функцию ack из конца массива', () => {
      const mockAck = () => {};
      const packet = ['askMessage', { id: 1 }, mockAck];

      expect(WsPacketHelper.getAckCallback(packet)).toBe(mockAck);
    });

    it('должен вернуть undefined, если клиент не передавал коллбэк подтверждения', () => {
      const packet = ['askMessage', { id: 1 }];
      expect(WsPacketHelper.getAckCallback(packet)).toBeUndefined();
    });
  });

  describe('parse (Монолитный разбор)', () => {
    it('должен разбирать фрейм на полную валидную структуру', () => {
      const mockAck = jest.fn();
      const mockPayload = { query: 'go' };
      const packet = ['search', mockPayload, mockAck];

      const result = WsPacketHelper.parse(packet);

      expect(result).toEqual({
        eventName: 'search',
        payload: mockPayload,
        hasAck: true,
        ackCallback: mockAck,
      });
    });
  });
});
