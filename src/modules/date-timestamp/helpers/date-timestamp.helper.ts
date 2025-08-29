// eslint-disable-next-line @typescript-eslint/no-require-imports
import Long = require('long');
import * as moment from 'moment';
import { Timestamp } from 'protos/compiled/google/protobuf/timestamp';
import {
  DATE_FORMAT,
  DATE_WORLD_STANDARD_FORMAT,
  DATE_YEAR_FORMAT,
  MILLISECONDS_IN_SECOND,
  MOSCOW_OFFSET,
  STRING_REGEX_DATE_FORMAT,
  STRING_REGEX_TIME_FORMAT,
  STRING_REGEX_TIMEZONE_FORMAT,
  STRING_REGEX_YEAR,
  REGEXP_CORRECT_DATE_TIME,
  REGEXP_WITH_TIMEZONE_OFFSET,
  TIME_HOUR_FORMAT,
  TIME_MILLISECOND_FORMAT,
  TIME_MINUTE_FORMAT,
  TIME_SECOND_FORMAT,
} from '../types/constants';
import { DateTimestamp } from '../types/date-timestamp';

export class DateTimestampHelper {
  public static toTimestamp(dateTimestamp: DateTimestamp): Timestamp {
    return {
      seconds: Long.fromValue(dateTimestamp.getUnix()).div(MILLISECONDS_IN_SECOND),
      nanos: dateTimestamp.getMilliseconds() * 1_000_000,
    };
  }

  public static fromTimestamp(timestamp: Timestamp): DateTimestamp {
    const ms = Long.fromNumber(timestamp.nanos / 1_000_000);
    const ts = Long.fromValue(timestamp.seconds).mul(MILLISECONDS_IN_SECOND).add(ms);

    return new DateTimestamp(ts.toNumber());
  }

  public static parseOffset(dateTime: number | string, format?: string): number {
    return moment.parseZone(dateTime, format).utcOffset();
  }

  public static parseFormat(dateTime: string): null | string {
    let format = '';

    if (REGEXP_CORRECT_DATE_TIME.test(dateTime)) {
      if (new RegExp(`^${STRING_REGEX_DATE_FORMAT}`).test(dateTime)) {
        // 01.01.1900 - 31.12.9999 - DD.MM.YYYY
        format = DATE_FORMAT;
      } else {
        // 1900-01-01 - 9999-12.31 - YYYY-MM.DD
        format = DATE_WORLD_STANDARD_FORMAT;
      }

      // [\sT] 00:10|00:10:10|00:10:10.999 Z|+00:00|+000|+00|+0
      const timeWithTimezoneOffset = dateTime.slice(10);

      if (!timeWithTimezoneOffset.length) {
        return format;
      }

      format +=
        (timeWithTimezoneOffset.slice(0, 1) === 'T' ? '[T]' : ' ') + `${TIME_HOUR_FORMAT}:${TIME_MINUTE_FORMAT}`;

      const parseTime = timeWithTimezoneOffset.split(':');

      if (parseTime.length > 2) {
        format += `:${TIME_SECOND_FORMAT}`;

        const parseSec = parseTime[2].split('.');

        if (parseSec.length > 1) {
          format += `.${TIME_MILLISECOND_FORMAT}`;
        }
      }

      if (REGEXP_WITH_TIMEZONE_OFFSET.test(dateTime)) {
        format += 'Z';
      }

      return format;
    }

    if (new RegExp(`^${STRING_REGEX_YEAR}$`).test(dateTime)) {
      // 1900 - 9999 - YYYY
      return DATE_YEAR_FORMAT;
    }

    if (new RegExp(`^${STRING_REGEX_TIME_FORMAT}`).test(dateTime)) {
      // 00:10|00:10:10|00:10:10.999 Z|+00:00|+000|+00|+0
      format += `${TIME_HOUR_FORMAT}:${TIME_MINUTE_FORMAT}`;

      const parseTime = dateTime.split(':');

      if (parseTime.length > 2) {
        format += `:${TIME_SECOND_FORMAT}`;

        const parseSec = parseTime[2].split('.');

        if (parseSec.length > 1) {
          format += `.${TIME_MILLISECOND_FORMAT}`;
        }
      }

      if (REGEXP_WITH_TIMEZONE_OFFSET.test(dateTime)) {
        format += 'Z';
      }

      return format;
    }

    if (new RegExp(`^${STRING_REGEX_TIMEZONE_FORMAT}$`).test(dateTime)) {
      // Z|+00:00|+000|+00|+0
      return `Z`;
    }

    return null;
  }

  public static initClientTimezoneOffset(startDate?: null | string): number {
    let clientTimezoneOffset: number = MOSCOW_OFFSET;

    if (startDate) {
      const dateTimeFormat = DateTimestampHelper.parseFormat(startDate);

      if (dateTimeFormat) {
        clientTimezoneOffset = DateTimestampHelper.parseOffset(startDate, dateTimeFormat);

        if (clientTimezoneOffset === 0 && dateTimeFormat.slice(-1) !== 'Z') {
          clientTimezoneOffset = MOSCOW_OFFSET;
        }
      }
    }

    return clientTimezoneOffset;
  }
}
