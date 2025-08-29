import * as moment from 'moment';
import 'moment-timezone';
import Diff = moment.unitOfTime.Diff;
import {
  MILLISECONDS_IN_SECOND,
  DATE_BASE_FORMAT,
  MOSCOW_OFFSET,
  DateTimestampErrorMessages,
  REGEXP_WITH_TIMEZONE_OFFSET,
  REGEXP_CORRECT_DATE_TIME,
} from './constants';
import { DateTimestampHelper } from '../helpers/date-timestamp.helper';

export class DateTimestamp {
  private moment: moment.Moment;
  private offset: number | null = MOSCOW_OFFSET;
  private setCorrectly = false;
  private readonly throwOnError: boolean = true;

  constructor(
    datetime?: null | string | number | Date | moment.Moment,
    offset?: null | string | number,
    throwOnError = true,
  ) {
    moment.tz.setDefault('Europe/Moscow');

    this.throwOnError = throwOnError;
    this.set(datetime, offset);
  }

  isValid(): boolean {
    return this.setCorrectly;
  }

  getMoment(): moment.Moment {
    return this.moment.clone();
  }

  /** sec: 1756338148000 */
  getUnix(): number {
    return this.moment.unix() * MILLISECONDS_IN_SECOND;
  }

  /** sec + ms: 1756338148678 */
  getTimestamp(): number {
    return this.moment.toDate().getTime();
  }

  /** ms [0..999]: 678 */
  getMilliseconds(): number {
    return this.moment.toDate().getMilliseconds();
  }

  /** sec + ms: 86410100 */
  diff(
    date?: null | string | number | Date | moment.Moment | DateTimestamp,
    offset?: null | string | number,
    unitOfTime?: Diff,
  ): number {
    let dateDiff: moment.Moment;

    if (date instanceof DateTimestamp) {
      dateDiff = date.getMoment();
    } else {
      dateDiff = new DateTimestamp(date, offset).getMoment();
    }

    if (unitOfTime) {
      return this.moment.diff(dateDiff, unitOfTime);
    }

    return this.moment.diff(dateDiff);
  }

  /**
   * Example: DD.MM.YYYY HH:mm:ss
   * @return date format as string | Invalid date
   */
  format(format?: null | string): string {
    if (!this.isValid()) {
      return DateTimestampErrorMessages.invalidDate;
    }

    return this.moment.format(format || DATE_BASE_FORMAT);
  }

  clone(): DateTimestamp {
    return new DateTimestamp(this.moment.clone(), this.moment.utcOffset(), this.throwOnError);
  }

  setTimeToStartDay(): this {
    this.moment.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0);

    return this;
  }

  setTimeToEndDay(): this {
    this.moment.set('hour', 23).set('minute', 59).set('second', 59).set('millisecond', 999);

    return this;
  }

  getUtcOffset(): number {
    return this.offset;
  }

  /**
   * Examples offsets:
   *  - "+07:00", "-05:00",
   *  - 3, -3 - hours
   *  - 3*60->120, -120 - minutes
   * keepLocalTime = true -> Схема временной зоны с сохранением времени, т.е. 2024-01-01T00:00:00+07:00 -> 2024-01-01T00:00:00+03:00
   * keepLocalTime = false -> Перевод во временную зону, т.е. 2024-01-01T00:00:00+07:00 -> 2023-12-31T20:00:00+03:00
   */
  setUtcOffset(offset: number | string, keepLocalTime?: boolean): this {
    this.moment.utcOffset(offset, keepLocalTime);

    this.offset = this.moment.utcOffset();

    return this;
  }

  set(dateTime?: null | string | number | Date | moment.Moment, offset?: null | string | number): this {
    this.setCorrectly = false;

    if (dateTime === null) {
      if (this.throwOnError) {
        throw new Error(DateTimestampErrorMessages.dateTimeNotSet);
      }

      return;
    }

    try {
      switch (typeof dateTime) {
        case 'number':
          this.moment = moment(dateTime);
          break;
        case 'string':
          this.moment = moment();

          if (dateTime === 'now' || dateTime === 'today') {
            // do nothing
          } else if (dateTime === 'tomorrow') {
            this.moment.add(1, 'day');
          } else if (dateTime === 'yesterday') {
            this.moment.add(-1, 'day');
          } else if (REGEXP_CORRECT_DATE_TIME.test(dateTime)) {
            const format = DateTimestampHelper.parseFormat(dateTime);

            this.moment = moment(dateTime, format);

            const hasTimezone = REGEXP_WITH_TIMEZONE_OFFSET.test(dateTime);
            if (hasTimezone) {
              const parsedOffset = DateTimestampHelper.parseOffset(dateTime, format);

              if (!isNaN(parsedOffset) && parsedOffset !== undefined && parsedOffset !== null) {
                this.setUtcOffset(parsedOffset);
              }
            }
          } else {
            throw new Error(`${DateTimestampErrorMessages.dateTimeUndefined} (${dateTime})`);
          }

          break;
        default:
          if (dateTime instanceof Date) {
            this.moment = moment(dateTime);
          } else if (moment.isMoment(dateTime)) {
            this.moment = dateTime.clone();
          } else {
            this.moment = moment();
          }
          break;
      }

      this.setCorrectly = true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      this.setCorrectly = false;

      if (this.throwOnError) {
        throw new Error(`${DateTimestampErrorMessages.dateTimeUndefined} (${dateTime})`);
      }
    }

    if (offset !== undefined && offset !== null) {
      this.setUtcOffset(offset, true);
    }

    return this;
  }

  /**
   * Examples: +1day, -5 days, 1month, 5 month, 1year, 5 years
   * !!! Not use mix:  +1day 5 hours
   */
  modify(modifyDatetime: string): this {
    if (modifyDatetime.indexOf('day') !== -1) {
      // (+/-)1 day, (+/1)10 days, etc.
      const dayNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('day')).trim();

      this.moment.add(dayNumber, 'days');
    } else if (modifyDatetime.indexOf('month') !== -1) {
      // (+/-)1 month, (+/1)10 months, etc.
      const monthNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('month')).trim();

      this.moment.add(monthNumber, 'months');
    } else if (modifyDatetime.indexOf('year') !== -1) {
      // (+/-)1 year, (+/1)10 years, etc.
      const yearNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('year')).trim();

      this.moment.add(yearNumber, 'years');
    } else if (modifyDatetime.indexOf('hour') !== -1) {
      // (+/-)1 hour, (+/1)10 hours, etc.
      const hourNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('hour')).trim();

      this.moment.add(hourNumber, 'hours');
    } else if (modifyDatetime.indexOf('minute') !== -1) {
      // (+/-)1 minute, (+/1)10 minutes, etc.
      const minuteNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('minute')).trim();

      this.moment.add(minuteNumber, 'minutes');
    } else if (modifyDatetime.indexOf('millisecond') !== -1) {
      // (+/-)1 millisecond, (+/1)10 milliseconds, etc.
      const millisecondNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('millisecond')).trim();

      this.moment.add(millisecondNumber, 'milliseconds');
    } else if (modifyDatetime.indexOf('second') !== -1) {
      // (+/-)1 second, (+/1)10 seconds, etc.
      const secondNumber = +modifyDatetime.slice(0, modifyDatetime.indexOf('second')).trim();

      this.moment.add(secondNumber, 'seconds');
    }
    return this;
  }
}
