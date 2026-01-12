/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateChannelOpts } from 'amqp-connection-manager';
import { MockAmqpConnectionManager } from './mock.amqp-connection-manager';
import { MockChannel } from './mock.channel';

export class MockChannelWrapper {
  channel: MockChannel;
  private options: CreateChannelOpts;

  constructor(private readonly connectionManager: MockAmqpConnectionManager) {
    this.channel = new MockChannel();
  }

  async publish(
    exchange: string,
    routingKey: string,
    content: Buffer | string | unknown,
    options?: any,
    done?: (err: Error | null | undefined, result?: any) => void,
  ): Promise<boolean> {
    return this.channel
      .publish(
        exchange,
        routingKey,
        content ? (Buffer.isBuffer(content) ? content : Buffer.from(content.toString())) : undefined,
        options,
      )
      .then((result) => {
        done(null, result);

        return result;
      })
      .catch((err) => {
        done(err);

        return err;
      });
  }

  async sendToQueue(
    queue: string,
    content: Buffer | string | unknown,
    options?: any,
    done?: (err: Error | null | undefined, result?: any) => void,
  ): Promise<boolean> {
    return this.channel
      .sendToQueue(
        queue,
        content ? (Buffer.isBuffer(content) ? content : Buffer.from(content.toString())) : undefined,
        options,
      )
      .then((result) => {
        done(null, result);

        return result;
      })
      .catch((err) => {
        done(err);

        return err;
      });
  }

  public setOptions(options: CreateChannelOpts): this {
    this.options = options;

    return this;
  }

  async close(): Promise<void> {}

  async testSetup() {
    if (this.options?.setup) {
      await this.options?.setup(this.channel as any, jest.fn());
    }
  }
}
