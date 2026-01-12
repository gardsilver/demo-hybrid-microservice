/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import * as amqp from 'amqplib';
import { AmqpConnectionManager, ChannelWrapper, CreateChannelOpts } from 'amqp-connection-manager';
import { MockChannelWrapper } from './mock.channel-wrapper';

interface Listener {
  (...args: any[]): void;
}

export class MockAmqpConnectionManager extends EventEmitter implements AmqpConnectionManager {
  heartbeatIntervalInSeconds: number;
  reconnectTimeInSeconds: number;
  readonly connection: amqp.ChannelModel | undefined;
  /** Returns the number of registered channels. */
  readonly channelCount: number;

  private onceEvents: Map<string, Listener[]>;
  private events: Map<string, Listener[]>;
  private channelWrapper: MockChannelWrapper;

  constructor() {
    super();
    this.onceEvents = new Map<string, Listener[]>();
    this.events = new Map<string, Listener[]>();
    this.channelWrapper = new MockChannelWrapper(this);
  }

  addListener(event: string, listener: Listener): this {
    let listeners: Listener[] = [];
    if (this.events.has(event)) {
      listeners = this.events.get(event);
    }
    listeners.push(listener);

    this.events.set(event, listeners);

    return this;
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    if (this.events.has(event)) {
      this.events.delete(event);
    }

    return this;
  }

  listeners(eventName: string): Listener[] {
    return this.events.has(eventName) ? this.events.get(eventName) : [];
  }

  on(event: string, listener: Listener): this {
    return this.addListener(event, listener);
  }

  once(event: string, listener: Listener): this {
    let listeners: Listener[] = [];
    if (this.onceEvents.has(event)) {
      listeners = this.onceEvents.get(event);
    }
    listeners.push(listener);

    this.onceEvents.set(event, listeners);

    return this;
  }

  async connect(options?: { timeout?: number }): Promise<void> {}

  reconnect(): void {}

  createChannel(options?: CreateChannelOpts): ChannelWrapper {
    return this.channelWrapper.setOptions(options) as undefined as ChannelWrapper;
  }

  async close(): Promise<void> {}

  isConnected(): boolean {
    return true;
  }

  async testEvents(event: string, ...args: any[]) {
    const listeners = this.events.has(event) ? this.events.get(event) : [];

    const task = [];

    listeners.forEach((listener) => {
      task.push(listener(...args));
    });

    await Promise.all(task);
  }

  async testOnceEvents(event: string, ...args: any[]) {
    const listeners = this.onceEvents.has(event) ? this.onceEvents.get(event) : [];

    const task = [];

    listeners.forEach((listener) => {
      task.push(listener(...args));
    });

    await Promise.all(task);
  }
}
