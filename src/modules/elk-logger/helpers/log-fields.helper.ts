import { merge } from 'ts-deepmerge';
import { ILogFields } from '../types/elk-logger.types';

export class LogFieldsHelper {
  static merge(src: ILogFields, add: ILogFields): ILogFields {
    const module = src?.module;
    const tgt = {
      ...merge(
        {
          ...src,
          markers: src?.markers ?? [],
          businessData: src?.businessData ?? {},
          payload: src?.payload ?? {},
        },
        {
          ...add,
          markers: add?.markers ?? [],
          businessData: add?.businessData ?? {},
          payload: add?.payload ?? {},
        },
      ),
    };

    if (module && add.module) {
      tgt.module = `${module}.${add.module}`;
    }

    return LogFieldsHelper.filterMarkers(tgt);
  }

  static filterMarkers(logFields: ILogFields): ILogFields {
    const tgt = Object.assign({}, logFields);

    if (logFields.markers?.length) {
      const markers = [];
      for (const marker of logFields.markers) {
        if (!markers.includes(marker) && marker) {
          markers.push(marker);
        }
      }
      if (markers.length) {
        tgt.markers = markers;
      } else {
        delete tgt['markers'];
      }
    }

    return tgt;
  }
}
