import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { ILogBody, ILogRecord, ILogRecordFormatter } from '../../types/elk-logger.types';
import { PruneMarkers, PruneMessages } from '../../types/prune.types';
import { PruneConfig } from './../prune.config';
import { LogFieldsHelper } from '../../helpers/log-fields.helper';

interface IParserKeyValue<D = IKeyValue> {
  data: D;
  markers: string[];
}

interface IParserValue {
  value: unknown;
  markers: string[];
}

@Injectable()
export class PruneFormatter implements ILogRecordFormatter {
  constructor(private readonly pruneConfig: PruneConfig) {}

  priority(): number {
    return Infinity;
  }

  private static addMarker(marker: string, markers: string[]): string[] {
    if (!markers.includes(marker)) {
      return [].concat(markers, [marker]);
    }

    return markers;
  }

  transform(from: ILogRecord): ILogRecord {
    let tgt: ILogRecord = LogFieldsHelper.merge({ ...from }, { markers: [] }) as ILogRecord;

    if (!this.pruneConfig.isApplyPrune()) {
      tgt = LogFieldsHelper.filterMarkers(tgt) as ILogRecord;
    } else {
      const normalized = this.pruneKeyValue(
        {
          businessData: from.businessData,
          payload: from.payload,
        },
        [],
      ) as IParserKeyValue<ILogBody>;

      tgt = LogFieldsHelper.merge(
        {
          ...tgt,
          ...normalized.data,
        },
        { markers: normalized.markers },
      ) as ILogRecord;
    }

    if (tgt.businessData && !Object.keys(tgt.businessData).length) {
      delete tgt['businessData'];
    }

    if (tgt.payload && !Object.keys(tgt.payload).length) {
      delete tgt['payload'];
    }

    return tgt;
  }

  private pruneKeyValue(data: IKeyValue, markers: string[], depth: number = 0): IParserKeyValue {
    if (depth + 1 > this.pruneConfig.getMaxDepth()) {
      return {
        data: {
          [PruneMessages.FIELD_NAME_IS_LIMIT]: PruneMessages.LIMIT_DEPTH,
        },
        markers: PruneFormatter.addMarker(PruneMarkers.LIMIT_DEPTH, markers),
      };
    }

    let isLimitCountFields = false;

    const tgt: IKeyValue = Object.assign({}, data);
    const fields = Object.keys(data);
    let fieldNameList = [].concat(fields);

    if (fieldNameList.length > this.pruneConfig.getMaxCountFields()) {
      isLimitCountFields = true;
      fieldNameList = fieldNameList.slice(0, this.pruneConfig.getMaxCountFields());
    }

    for (const fieldName of fields) {
      if (!fieldNameList.includes(fieldName)) {
        delete tgt[fieldName];

        continue;
      }

      const filedValue = data[fieldName];

      const parseValue = this.pruneValue(filedValue, markers, depth + 1, fieldName);

      tgt[fieldName] = parseValue.value;
      markers = parseValue.markers;
    }

    if (isLimitCountFields) {
      markers = PruneFormatter.addMarker(PruneMarkers.LIMIT_COUNT_FIELDS, markers);

      tgt[PruneMessages.FIELD_NAME_IS_LIMIT] = PruneMessages.LIMIT_COUNT_FIELDS;
    }

    return {
      data: tgt,
      markers,
    };
  }

  private pruneValue(value: unknown, markers: string[], depth: number, fieldName?: string): IParserValue {
    if (!value) {
      return {
        value,
        markers,
      };
    }

    if (typeof value === 'string') {
      if (value.length > this.pruneConfig.getLengthField(fieldName)) {
        return {
          value: value.slice(0, this.pruneConfig.getLengthField(fieldName)) + PruneMessages.LIMIT_LENGTH,
          markers: PruneFormatter.addMarker(PruneMarkers.LIMIT_LENGTH, markers),
        };
      }

      return {
        value,
        markers,
      };
    }

    if (Array.isArray(value)) {
      if (depth + 1 > this.pruneConfig.getMaxDepth()) {
        return {
          value: [PruneMessages.LIMIT_DEPTH],
          markers: PruneFormatter.addMarker(PruneMarkers.LIMIT_DEPTH, markers),
        };
      }

      let isLimitArrayCount = false;
      let tgt: unknown[] = [].concat(value);

      if (tgt.length > this.pruneConfig.getLengthArray(fieldName)) {
        isLimitArrayCount = true;

        tgt = tgt.slice(0, this.pruneConfig.getLengthArray(fieldName));
      }

      tgt = tgt.map((v) => {
        const parse = this.pruneValue(v, markers, depth + 1, fieldName);

        markers = parse.markers;

        return parse.value;
      });

      if (isLimitArrayCount) {
        return {
          value: [].concat(tgt, [PruneMessages.LIMIT_LENGTH_ARRAY]),
          markers: PruneFormatter.addMarker(PruneMarkers.LIMIT_LENGTH_ARRAY, markers),
        };
      }

      return {
        value: tgt,
        markers,
      };
    }

    if (typeof value === 'object') {
      if (this.pruneConfig.getElkLoggerConfig().isIgnoreObject(value)) {
        return {
          value,
          markers,
        };
      }

      if (depth + 1 > this.pruneConfig.getMaxDepth()) {
        return {
          value: {
            [PruneMessages.FIELD_NAME_IS_LIMIT]: PruneMessages.LIMIT_DEPTH,
          },
          markers: PruneFormatter.addMarker(PruneMarkers.LIMIT_DEPTH, markers),
        };
      }

      const parse = this.pruneKeyValue(value as IKeyValue, markers, depth + 1);

      return {
        value: parse.data,
        markers: parse.markers,
      };
    }

    return {
      value,
      markers,
    };
  }
}
