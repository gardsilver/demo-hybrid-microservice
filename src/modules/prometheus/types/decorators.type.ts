/* eslint-disable @typescript-eslint/no-explicit-any */
import { IGeneralAsyncContext } from 'src/modules/common';
import {
  ICounterMetricConfig,
  ICounterParams,
  IGaugeMetricConfig,
  IGaugeParams,
  IHistogramMetricConfig,
  IHistogramParams,
  IMetricConfig,
  IParamsPrometheusLabels,
  ISummaryMetricConfig,
  ISummaryParams,
  PrometheusLabels,
} from './types';
import { PrometheusManager } from '../services/prometheus.manager';
import { PrometheusEventArgs } from '../services/prometheus.event-service';

export interface IPrometheusParams<M extends IMetricConfig, P> {
  metricConfig: M;
  params?: P;
}

export interface ICounterConfig<P = ICounterParams> {
  increment?: Partial<IPrometheusParams<ICounterMetricConfig, P>> | false;
}

export interface IGaugeConfig<P = IGaugeParams> {
  increment?: Partial<IPrometheusParams<IGaugeMetricConfig, P>> | false;

  decrement?: Partial<IPrometheusParams<IGaugeMetricConfig, P>> | false;
}

export interface IHistogramConfig {
  observe?: Partial<IPrometheusParams<IHistogramMetricConfig, IHistogramParams>> | false;

  startTimer?: Partial<IPrometheusParams<IHistogramMetricConfig, IHistogramParams>> | false;

  end?: Partial<IParamsPrometheusLabels> | false;
}

export interface ISummaryConfig {
  observe?: Partial<IPrometheusParams<ISummaryMetricConfig, ISummaryParams>> | false;

  startTimer?: Partial<IPrometheusParams<ISummaryMetricConfig, ISummaryParams>> | false;

  end?: Partial<IParamsPrometheusLabels> | false;
}

export interface IPrometheusEventConfig<H = IHistogramConfig, S = ISummaryConfig> {
  counter?: false | ICounterConfig;
  gauge?: false | IGaugeConfig;
  histogram?: false | H;
  summary?: false | S;
  custom?: false | ((options: PrometheusEventArgs & { prometheusManager: PrometheusManager }) => void);
}

export interface IPrometheusOnMethod {
  labels?:
    | (false | PrometheusLabels)
    | ((options?: { labels?: PrometheusLabels; methodsArgs?: any[] }) => false | PrometheusLabels);
  before?:
    | (
        | false
        | IPrometheusEventConfig<Omit<IHistogramConfig, 'observe' | 'end'>, Omit<ISummaryConfig, 'observe' | 'end'>>
      )
    | ((options?: {
        labels?: PrometheusLabels;
        methodsArgs?: any[];
      }) =>
        | false
        | IPrometheusEventConfig<Omit<IHistogramConfig, 'observe' | 'end'>, Omit<ISummaryConfig, 'observe' | 'end'>>);

  after?:
    | (
        | false
        | IPrometheusEventConfig<
            Omit<IHistogramConfig, 'startTimer' | 'end'>,
            Omit<ISummaryConfig, 'startTimer' | 'end'>
          >
      )
    | ((options?: {
        result?: any;
        duration?: number;
        labels?: PrometheusLabels;
        methodsArgs?: any[];
      }) =>
        | false
        | IPrometheusEventConfig<
            Omit<IHistogramConfig, 'startTimer' | 'end'>,
            Omit<ISummaryConfig, 'startTimer' | 'end'>
          >);

  throw?:
    | (
        | false
        | IPrometheusEventConfig<
            Omit<IHistogramConfig, 'startTimer' | 'end'>,
            Omit<ISummaryConfig, 'startTimer' | 'end'>
          >
      )
    | ((options?: {
        error: unknown;
        duration?: number;
        labels?: PrometheusLabels;
        methodsArgs?: any[];
      }) =>
        | false
        | IPrometheusEventConfig<
            Omit<IHistogramConfig, 'startTimer' | 'end'>,
            Omit<ISummaryConfig, 'startTimer' | 'end'>
          >);

  finally?:
    | (
        | false
        | IPrometheusEventConfig<
            Omit<IHistogramConfig, 'startTimer' | 'end'>,
            Omit<ISummaryConfig, 'startTimer' | 'end'>
          >
      )
    | ((options?: {
        duration?: number;
        labels?: PrometheusLabels;
        methodsArgs?: any[];
      }) =>
        | false
        | IPrometheusEventConfig<
            Omit<IHistogramConfig, 'startTimer' | 'end'>,
            Omit<ISummaryConfig, 'startTimer' | 'end'>
          >);
}

export interface ITargetPrometheusOnMethod {
  instanceName: string;
  methodName: string;
  context?: IGeneralAsyncContext;
  flush?: boolean;
  prometheusEventConfig: IPrometheusEventConfig | false;
}
