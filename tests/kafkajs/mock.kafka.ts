/* eslint-disable @typescript-eslint/no-explicit-any */
type MockListener = (...args: any[]) => void;

export class MockProducer {
  constructor(public readonly config?: Record<string, unknown>) {}
  connect() {}
  send() {}
  sendBatch() {}
  disconnect() {}
}

export class MockConsumer {
  public events = {
    HEARTBEAT: 'consumer.heartbeat',
    COMMIT_OFFSETS: 'consumer.commit_offsets',
    GROUP_JOIN: 'consumer.group_join',
    FETCH_START: 'consumer.fetch_start',
    FETCH: 'consumer.fetch',
    START_BATCH_PROCESS: 'consumer.start_batch_process',
    END_BATCH_PROCESS: 'consumer.end_batch_process',
    CONNECT: 'consumer.connect',
    DISCONNECT: 'consumer.disconnect',
    STOP: 'consumer.stop',
    CRASH: 'consumer.crash',
    REBALANCING: 'consumer.rebalancing',
    RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics',
    REQUEST: 'consumer.network.request',
    REQUEST_TIMEOUT: 'consumer.network.request_timeout',
    REQUEST_QUEUE_SIZE: 'consumer.network.request_queue_size',
  };
  private _events = new Map<string, MockListener[]>();

  constructor(public readonly config?: Record<string, unknown>) {}
  connect() {}
  subscribe() {}
  run() {
    this.emit(this.events.GROUP_JOIN);
  }
  disconnect() {}
  on(event: string, callback: MockListener) {
    const calls: MockListener[] = this._events.get(event) ?? [];
    calls.push(callback);

    this._events.set(event, calls);

    return () => {
      const listeners = this._events.get(event) ?? [];
      this._events.set(
        event,
        listeners.filter((cb) => cb !== callback),
      );
    };
  }
  emit(event: string, ...args: any[]) {
    const calls = this._events.get(event) ?? [];

    calls.forEach((element) => {
      element(...args);
    });
  }
}

export class MockKafka {
  constructor(public readonly config?: Record<string, unknown>) {}
  producer(config?: Record<string, unknown>) {
    return new MockProducer(config);
  }
  consumer(config?: Record<string, unknown>) {
    return new MockConsumer(config);
  }
}
