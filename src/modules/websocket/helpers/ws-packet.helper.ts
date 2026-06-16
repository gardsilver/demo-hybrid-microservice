/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IWsPacketStructure<T = any> {
  eventName: string | undefined;
  payload: T | undefined;
  hasAck: boolean;
  ackCallback: ((...args: any[]) => void) | undefined;
}

export abstract class WsPacketHelper {
  public static getEventName(packet: unknown): string | undefined {
    if (!packet) return undefined;

    if (Array.isArray(packet) && packet.length > 0) {
      const eventName = packet[0];
      return typeof eventName === 'string' && eventName !== '' ? eventName : undefined;
    }

    if (typeof packet === 'string' && packet !== '') {
      return packet;
    }

    return undefined;
  }

  public static getPayload<T = any>(packet: unknown): T | undefined {
    if (Array.isArray(packet) && packet.length > 1) {
      const possiblePayload = packet[1];
      if (typeof possiblePayload !== 'function') {
        return possiblePayload as T;
      }
    }
    return undefined;
  }

  public static getAckCallback(packet: unknown): ((...args: any[]) => void) | undefined {
    if (Array.isArray(packet) && packet.length > 0) {
      const lastElement = packet[packet.length - 1];
      if (typeof lastElement === 'function') {
        return lastElement as (...args: any[]) => void;
      }
    }
    return undefined;
  }

  public static parse<T = any>(packet: unknown): IWsPacketStructure<T> {
    const eventName = WsPacketHelper.getEventName(packet);
    const payload = WsPacketHelper.getPayload<T>(packet);
    const ackCallback = WsPacketHelper.getAckCallback(packet);

    return {
      eventName,
      payload,
      hasAck: ackCallback !== undefined,
      ackCallback,
    };
  }
}
