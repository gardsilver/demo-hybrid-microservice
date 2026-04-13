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
  private static onMethods:
    | ReplaySubject<
        ITargetPrometheusOnMethod & {
          eventArgs: PrometheusEventArgs;
          ticketId: string;
        }
      >
    | undefined;
  private static subscription: Subscription | undefined;
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
      clear: param.clear ?? false,
    };

    if (param.prometheusEventConfig === false) {
      this.handleClear(options);

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
      clear?: boolean;
    },
  ): void {
    this.handleCounter(param.counter ?? false);
    this.handleGauge(param.gauge ?? false);
    this.handleHistogram(param.histogram ?? false, options);
    this.handleSummary(param.summary ?? false, options);
    this.handleCustom(param.custom, options);
    this.handleClear(options);
  }

  private handleCounter(counter: false | ICounterConfig): void {
    if (!counter || !counter.increment) {
      return;
    }

    if (counter.increment === true) {
      throw new Error('Invalid configuration Prometheus Handle Counter Increment!!!');
    }

    if (counter.increment.metricConfig === undefined) {
      throw new Error('Invalid configuration Prometheus Handle Counter Increment: metricConfig is required');
    }

    this.prometheusManager.counter().increment(counter.increment.metricConfig, counter.increment.params);
  }

  private handleGauge(gauge: false | IGaugeConfig): void {
    if (!gauge) {
      return;
    }

    if (gauge.increment) {
      if (gauge.increment === true) {
        throw new Error('Invalid configuration Prometheus Handle Gauge Increment!!!');
      }

      if (gauge.increment.metricConfig === undefined) {
        throw new Error('Invalid configuration Prometheus Handle Gauge Increment: metricConfig is required');
      }

      this.prometheusManager.gauge().increment(gauge.increment.metricConfig, gauge.increment.params);
    }

    if (gauge.decrement) {
      if (gauge.decrement === true) {
        throw new Error('Invalid configuration Prometheus Handle Gauge Decrement!!!');
      }

      if (gauge.decrement.metricConfig === undefined) {
        throw new Error('Invalid configuration Prometheus Handle Gauge Decrement: metricConfig is required');
      }

      this.prometheusManager.gauge().decrement(gauge.decrement.metricConfig, gauge.decrement.params);
    }
  }

  private handleHistogram(
    histogram: false | IHistogramConfig,
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      clear?: boolean;
    },
  ): void {
    if (!histogram) {
      return;
    }

    if (histogram.startTimer) {
      if (histogram.startTimer === true) {
        throw new Error('Invalid configuration Prometheus Handle Histogram StartTimer!!!');
      }

      if (histogram.startTimer.metricConfig === undefined) {
        throw new Error('Invalid configuration Prometheus Handle Histogram StartTimer: metricConfig is required');
      }

      const endCallback = this.prometheusManager
        .histogram()
        .startTimer(histogram.startTimer.metricConfig, histogram.startTimer.params);

      PrometheusEventService.addEndCallback(options.ticketId, 'histogram', endCallback);
    }

    if (histogram.observe) {
      if (histogram.observe === true) {
        throw new Error('Invalid configuration Prometheus Handle Histogram Observe!!!');
      }

      if (histogram.observe.metricConfig === undefined || histogram.observe.params === undefined) {
        throw new Error('Invalid configuration Prometheus Handle Histogram Observe: metricConfig/params are required');
      }

      this.prometheusManager.histogram().observe(histogram.observe.metricConfig, histogram.observe.params);
    }

    if (histogram.end) {
      if (PrometheusEventService.onEndCallback.has(options.ticketId)) {
        PrometheusEventService.onEndCallback.get(options.ticketId)?.histogram?.(histogram.end?.labels);
      }
    }
  }

  private handleSummary(
    summary: false | ISummaryConfig,
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      clear?: boolean;
    },
  ): void {
    if (!summary) {
      return;
    }

    if (summary.startTimer) {
      if (summary.startTimer === true) {
        throw new Error('Invalid configuration Prometheus Handle Summary StartTimer!!!');
      }

      if (summary.startTimer.metricConfig === undefined) {
        throw new Error('Invalid configuration Prometheus Handle Summary StartTimer: metricConfig is required');
      }

      const endCallback = this.prometheusManager
        .summary()
        .startTimer(summary.startTimer.metricConfig, summary.startTimer.params);

      PrometheusEventService.addEndCallback(options.ticketId, 'summary', endCallback);
    }

    if (summary.observe) {
      if (summary.observe === true) {
        throw new Error('Invalid configuration Prometheus Handle Summary Observe!!!');
      }

      if (summary.observe.metricConfig === undefined || summary.observe.params === undefined) {
        throw new Error('Invalid configuration Prometheus Handle Summary Observe: metricConfig/params are required');
      }

      this.prometheusManager.summary().observe(summary.observe.metricConfig, summary.observe.params);
    }

    if (summary.end) {
      if (PrometheusEventService.onEndCallback.has(options.ticketId)) {
        PrometheusEventService.onEndCallback.get(options.ticketId)?.summary?.(summary.end?.labels);
      }
    }
  }

  private handleCustom(
    custom: IPrometheusEventConfig['custom'],
    options: {
      ticketId: string;
      eventArgs: PrometheusEventArgs;
      clear?: boolean;
    },
  ): void {
    if (!custom) {
      return;
    }

    custom.call(undefined, { ...options.eventArgs, prometheusManager: this.prometheusManager });
  }

  private handleClear(options: { ticketId: string; eventArgs: PrometheusEventArgs; clear?: boolean }): void {
    if (!options.clear) {
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
    const callbacks = PrometheusEventService.onEndCallback.get(ticketId);

    if (callbacks !== undefined) {
      callbacks[type] = endCallback;

      PrometheusEventService.onEndCallback.set(ticketId, callbacks);
    } else {
      PrometheusEventService.onEndCallback.set(ticketId, {
        [type]: endCallback,
      });
    }
  }
}
