import { ExceptionHelper } from 'src/modules/common';
import { PrometheusLabels } from 'src/modules/prometheus';

const TYPE_REG_EXP = new RegExp('^(\\S*):.+$');
const SOURCE_REG_EXP = new RegExp('^at\\s+((()(\\S+:\\d+:\\d+))|((\\S+.\\S+)\\s+\\((\\S+:\\d+:\\d+)\\)))$');

export class UncaughtExceptionHelper {
  static getRejectionLabels(reason: unknown): PrometheusLabels {
    if (typeof reason === 'string') {
      return { reason };
    }

    if (reason instanceof Error) {
      return {
        reason: 'message' in reason ? (reason['message'] as undefined as string) : undefined,
        ...UncaughtExceptionHelper.getUncaughtExceptionLabels(reason),
      };
    }

    return {};
  }

  static getUncaughtExceptionLabels(error): PrometheusLabels {
    const labels = <PrometheusLabels>{};

    const type = typeof error;

    if (['string', 'bigint', 'number', 'symbol', 'undefined'].includes(type)) {
      labels.type = type;

      return labels;
    }

    if (type === 'function') {
      labels.type = error.name;

      return labels;
    }

    if (type === 'object') {
      labels.type = error?.prototype?.constructor?.name ?? error?.constructor?.name ?? error?.name ?? 'object';
    }

    const stack: string[] =
      'stack' in error && typeof error['stack'] === 'string'
        ? (ExceptionHelper.stackFormat(error['stack']) as undefined as string[])
        : [];

    if (!stack?.length) {
      return labels;
    }

    const typeInfo = stack.shift();

    labels.type = UncaughtExceptionHelper.extractType(typeInfo);

    const sourceInfo = stack.shift();

    if (sourceInfo === undefined) {
      return labels;
    }

    return {
      ...labels,
      ...UncaughtExceptionHelper.extractSourceInfo(sourceInfo),
    };
  }

  static extractType(typeInfo: string): string {
    const search = typeInfo.match(TYPE_REG_EXP);

    return search !== null && search.length > 0 ? search[1] : undefined;
  }

  static extractSourceInfo(sourceInfo: string): PrometheusLabels {
    const search = sourceInfo.match(SOURCE_REG_EXP);

    if (!search?.length) {
      return undefined;
    }

    if (search[3] === undefined) {
      return {
        module: search[6],
        file: search[7]?.split(':').shift(),
      };
    }

    return {
      module: search[3],
      file: search[4]?.split(':').shift(),
    };
  }
}
