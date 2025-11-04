/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReplaySubject, Subscription } from 'rxjs';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common';
import { PrometheusLabels } from '../types/types';
import {
  ICounterConfig,
  IGaugeConfig,
  IHistogramConfig,
  IPrometheusEventConfig,
  ISummaryConfig,
  ITargetPrometheusOnMethod,
} from '../types/decorators.type';
import { PrometheusManager } from './prometheus.manager';

export type PrometheusEventArgs = {
  error?: unknown;
  result?: any;
  duration?: number;
  labels?: PrometheusLabels;
  methodsArgs?: any[];
};

interface IPrometheusEndCallback {
  histogram?: (labels?: PrometheusLabels) => number;
  summary?: (labels?: PrometheusLabels) => number;
}

@Injectable()
export class PrometheusEventService implements OnApplicationShutdown {
  private static onMethods: ReplaySubject<
    ITargetPrometheusOnMethod & {
      eventArgs: PrometheusEventArgs;
      ticketId: string;
    }
  >;
  private static subscription: Subscription;
  private static onEndCallback: Map<string, IPrometheusEndCallback>;

  constructor(private readonly prometheusManager: PrometheusManager) {
    if (PrometheusEventService.onMethods === undefined) {
      PrometheusEventService.onMethods = new ReplaySubject<
        ITargetPrometheusOnMethod & {
          eventArgs: PrometheusEventArgs;
          ticketId: string;
        }
      >(undefined);

      PrometheusEventService.subscription = PrometheusEventService.onMethods.asObservable().subscribe({
        next: (value) => {
          if (value === undefined) {
            return;
          }

          this.handleOnMethod(value);
        },
      });
    }
    if (PrometheusEventService.onEndCallback === undefined) {
      PrometheusEventService.onEndCallback = new Map<string, IPrometheusEndCallback>();
    }
  }

  public async onApplicationShutdown(): Promise<void> {
    PrometheusEventService.subscription?.unsubscribe();

    PrometheusEventService.subscription = undefined;
    PrometheusEventService.onMethods = undefined;
  }

  public static emit(ticketId: string, eventArgs: PrometheusEventArgs, param: ITargetPrometheusOnMethod): void {
    PrometheusEventService.onMethods?.next({ ...param, eventArgs, ticketId });
  }

  private handleOnMethod(
    param: ITargetPrometheusOnMethod & {
      eventArgs: PrometheusEventArgs;
      ticketId: string;
    },
  ): void {
    const options = {
      ticketId: param.ticketId,
      eventArgs: param.eventArgs,
      flush: param.flush ?? false,
    };

    if (param.prometheusEventConfig === false) {
      this.handleFlush(options);

      return;
    }

    const prometheusEventConfig: IPrometheusEventConfig = param.prometheusEventConfig;

    GeneralAsyncContext.instance.runWithContext(() => {
      this.handleEvent(prometheusEventConfig, options);
    }, param.context ?? {});
  }

  private handleEvent(
    param: IPrometheusEventConfig,
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      flush?: boolean;
    },
  ): void {
    this.handleCounter(param.counter);
    this.handleGauge(param.gauge);
    this.handleHistogram(param.histogram, options);
    this.handleSummary(param.summary, options);
    this.handleCustom(param.custom, options);
    this.handleFlush(options);
  }

  private handleCounter(counter: false | ICounterConfig): void {
    if (!counter) {
      return;
    }

    if (counter.increment) {
      this.prometheusManager.counter().increment(counter.increment.metricConfig, counter.increment.params);
    }
  }

  private handleGauge(gauge: false | IGaugeConfig): void {
    if (!gauge) {
      return;
    }

    if (gauge.increment) {
      this.prometheusManager.gauge().increment(gauge.increment.metricConfig, gauge.increment.params);
    }

    if (gauge.decrement) {
      this.prometheusManager.gauge().decrement(gauge.decrement.metricConfig, gauge.decrement.params);
    }
  }

  private handleHistogram(
    histogram: false | IHistogramConfig,
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      flush?: boolean;
    },
  ): void {
    if (!histogram) {
      return;
    }

    if (histogram.startTimer) {
      const endCallback = this.prometheusManager
        .histogram()
        .startTimer(histogram.startTimer.metricConfig, histogram.startTimer.params);

      PrometheusEventService.addEndCallback(options.ticketId, 'histogram', endCallback);
    }

    if (histogram.observe) {
      this.prometheusManager.histogram().observe(histogram.observe.metricConfig, histogram.observe.params);
    }

    if (histogram.end) {
      if (PrometheusEventService.onEndCallback.has(options.ticketId)) {
        PrometheusEventService.onEndCallback.get(options.ticketId).histogram(histogram.end?.labels);
      }
    }
  }

  private handleSummary(
    summary: false | ISummaryConfig,
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      flush?: boolean;
    },
  ): void {
    if (!summary) {
      return;
    }

    if (summary.startTimer) {
      const endCallback = this.prometheusManager
        .summary()
        .startTimer(summary.startTimer.metricConfig, summary.startTimer.params);

      PrometheusEventService.addEndCallback(options.ticketId, 'summary', endCallback);
    }

    if (summary.observe) {
      this.prometheusManager.summary().observe(summary.observe.metricConfig, summary.observe.params);
    }

    if (summary.end) {
      if (PrometheusEventService.onEndCallback.has(options.ticketId)) {
        PrometheusEventService.onEndCallback.get(options.ticketId).summary(summary.end?.labels);
      }
    }
  }

  private handleCustom(
    custom: IPrometheusEventConfig['custom'],
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      flush?: boolean;
    },
  ): void {
    if (!custom) {
      return;
    }

    custom.call(undefined, { ...options.eventArgs, prometheusManager: this.prometheusManager });
  }

  private handleFlush(options: { ticketId: string; eventArgs: PrometheusEventArgs; flush?: boolean }): void {
    if (!options.flush) {
      return;
    }

    if (PrometheusEventService.onEndCallback.has(options.ticketId)) {
      PrometheusEventService.onEndCallback.delete(options.ticketId);
    }
  }

  private static addEndCallback(
    ticketId: string,
    type: keyof IPrometheusEndCallback,
    endCallback: (labels?: PrometheusLabels) => number,
  ) {
    if (PrometheusEventService.onEndCallback.has(ticketId)) {
      const callbacks = PrometheusEventService.onEndCallback.get(ticketId);

      callbacks[type] = endCallback;

      PrometheusEventService.onEndCallback.set(ticketId, callbacks);
    } else {
      PrometheusEventService.onEndCallback.set(ticketId, {
        [type]: endCallback,
      });
    }
  }
}
