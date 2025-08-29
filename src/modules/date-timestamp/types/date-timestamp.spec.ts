import * as moment from 'moment';
import 'moment-timezone';
import {
  MILLISECONDS_IN_SECOND,
  TIME_MILLISECOND_FORMAT,
  DATE_TIME_FORMAT,
  DATE_BASE_FORMAT,
  DATE_TIME_WORLD_STANDARD_FORMAT,
  DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT,
  UTC_OFFSET,
  MOSCOW_OFFSET,
  DateTimestampErrorMessages,
} from './constants';
import { DateTimestamp } from './date-timestamp';

export const MOCK_DATE = new Date();

jest.mock('moment-timezone', () => {
  const actualMoment = jest.requireActual('moment-timezone');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockMoment = (...args: any[]) => {
    if (args.length > 0) {
      return actualMoment(...args);
    }
    return MOCK_DATE;
  };

  Object.assign(mockMoment, actualMoment);

  return mockMoment;
});

describe(DateTimestamp.name, () => {
  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockImplementation(() => {
      return MOCK_DATE.getTime();
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('Basic tests', async () => {
    expect(new DateTimestamp(undefined).format()).toStrictEqual(
      moment().utcOffset(MOSCOW_OFFSET).format(DATE_BASE_FORMAT),
    );
    expect(new DateTimestamp().format()).toStrictEqual(moment().utcOffset(MOSCOW_OFFSET).format(DATE_BASE_FORMAT));

    expect(new DateTimestamp(undefined).format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().utcOffset(MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(new DateTimestamp().format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().utcOffset(MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );

    expect(new DateTimestamp('kjfrfbsrt', undefined, false).isValid()).toBeFalsy();
    expect(new DateTimestamp('kjfrfbsrt', undefined, false).format(DATE_BASE_FORMAT)).toStrictEqual(
      DateTimestampErrorMessages.invalidDate,
    );

    expect(new DateTimestamp('kjfrfbsrt', UTC_OFFSET, false).isValid()).toBeFalsy();
    expect(new DateTimestamp('kjfrfbsrt', UTC_OFFSET, false).format(DATE_BASE_FORMAT)).toStrictEqual(
      DateTimestampErrorMessages.invalidDate,
    );

    expect(() => new DateTimestamp(null)).toThrow(new Error(DateTimestampErrorMessages.dateTimeNotSet));
    expect(typeof new DateTimestamp(null, undefined, false)).toBe('object');
    expect(new DateTimestamp(null, undefined, false)).toEqual({
      offset: 180,
      setCorrectly: false,
      throwOnError: false,
    });
    expect(new DateTimestamp(null, undefined, false).isValid()).toBeFalsy();

    expect(new DateTimestamp(1691425521329).format(DATE_TIME_FORMAT)).toBe('07.08.2023 19:25:21');
  });

  it(DateTimestamp.prototype.getUtcOffset.name, async () => {
    expect(new DateTimestamp().getUtcOffset()).toStrictEqual(MOSCOW_OFFSET);
    expect(new DateTimestamp(undefined).getUtcOffset()).toStrictEqual(MOSCOW_OFFSET);
    expect(new DateTimestamp(undefined, UTC_OFFSET).getUtcOffset()).toStrictEqual(UTC_OFFSET);

    expect(new DateTimestamp('2023-10-06').format()).toStrictEqual('2023-10-06T00:00:00+03:00');
    expect(new DateTimestamp('2023-10-06', 420).format()).toStrictEqual('2023-10-06T00:00:00+07:00');
    expect(new DateTimestamp('2023-10-06', '+07:00').format()).toStrictEqual('2023-10-06T00:00:00+07:00');
    expect(new DateTimestamp('2023-10-06', 7).format()).toStrictEqual('2023-10-06T00:00:00+07:00');

    expect(new DateTimestamp('2023-10-06 11:00:00').format()).toStrictEqual('2023-10-06T11:00:00+03:00');
    expect(new DateTimestamp('2023-10-06 11:00:00', 420).format()).toStrictEqual('2023-10-06T11:00:00+07:00');
    expect(new DateTimestamp('2023-10-06 11:00:00', '+07:00').format()).toStrictEqual('2023-10-06T11:00:00+07:00');
    expect(new DateTimestamp('2023-10-06 11:00:00', 7).format()).toStrictEqual('2023-10-06T11:00:00+07:00');

    expect(new DateTimestamp('2022-01-01 23:59:59').format()).toStrictEqual('2022-01-01T23:59:59+03:00');
    expect(new DateTimestamp('2022-01-01 23:59:59', UTC_OFFSET).format()).toStrictEqual('2022-01-01T23:59:59+00:00');
    expect(new DateTimestamp('2022-01-01 23:59:59').setUtcOffset(UTC_OFFSET).format()).toStrictEqual(
      '2022-01-01T20:59:59+00:00',
    );
    expect(new DateTimestamp('2022-01-01 23:59:59').setUtcOffset(MOSCOW_OFFSET).format()).toStrictEqual(
      '2022-01-01T23:59:59+03:00',
    );

    expect(new DateTimestamp('2022-01-01', MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_FORMAT)).toStrictEqual(
      '2022-01-01 00:00:00',
    );
    expect(new DateTimestamp('2022-01-01', MOSCOW_OFFSET).format()).toStrictEqual('2022-01-01T00:00:00+03:00');
    expect(
      new DateTimestamp('2022-01-01 10:00:15', MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toStrictEqual('2022-01-01 10:00:15');
    expect(
      new DateTimestamp('2022-01-01 12:14:15', MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    ).toStrictEqual('2022-01-01 12:14');

    expect(
      new DateTimestamp('2023-10-06 11:00:00+07:00', MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toStrictEqual(moment('2023-10-06 11:00:00+07:00').utcOffset(420).format(DATE_TIME_WORLD_STANDARD_FORMAT));
    expect(new DateTimestamp('01.01.2022 11:00:00+07:00').format(DATE_TIME_WORLD_STANDARD_FORMAT)).toStrictEqual(
      moment('2022-01-01 07:00:00').utcOffset(420).format(DATE_TIME_WORLD_STANDARD_FORMAT),
    );
    expect(
      new DateTimestamp('01.01.2022 11:00:00+07', MOSCOW_OFFSET).format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toStrictEqual(moment('2022-01-01 07:00:00').utcOffset(420).format(DATE_TIME_WORLD_STANDARD_FORMAT));

    expect(
      new DateTimestamp('01.01.2022 12:00:00', DATE_TIME_FORMAT).setUtcOffset(MOSCOW_OFFSET).format(DATE_TIME_FORMAT),
    ).toStrictEqual(moment('2022-01-01 15:00:00').utcOffset(UTC_OFFSET).format(DATE_TIME_FORMAT));
    expect(
      new DateTimestamp('01.01.2022 15:00:00', DATE_TIME_FORMAT).setUtcOffset(UTC_OFFSET).format(DATE_TIME_FORMAT),
    ).toStrictEqual(moment('2022-01-01 12:00:00').format(DATE_TIME_FORMAT));
    expect(
      new DateTimestamp('2022-01-01 12:00:00', DATE_TIME_WORLD_STANDARD_FORMAT).format(DATE_TIME_FORMAT),
    ).toStrictEqual(moment('2022-01-01 12:00:00').utcOffset(MOSCOW_OFFSET).format(DATE_TIME_FORMAT));
    expect(
      new DateTimestamp('2022-01-01 15:00:00', DATE_TIME_WORLD_STANDARD_FORMAT)
        .setUtcOffset(UTC_OFFSET)
        .format(DATE_TIME_FORMAT),
    ).toStrictEqual(moment('2022-01-01 12:00:00').format(DATE_TIME_FORMAT));

    expect(
      new DateTimestamp('2023-03-03 00:00:00+07:00')
        .setUtcOffset(MOSCOW_OFFSET)
        .format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-03-02 20:00:00');
    expect(new DateTimestamp('2023-03-03 00:00:00+07:00').format(DATE_TIME_WORLD_STANDARD_FORMAT)).toBe(
      '2023-03-03 00:00:00',
    );
    expect(new DateTimestamp('2023-03-03 00:00:00+07:00').getUtcOffset()).toBe(420);
    expect(new DateTimestamp('2023-03-03 00:00:00+07:00', '+03:00').format()).toBe('2023-03-03T00:00:00+03:00');

    expect(new DateTimestamp('2023-03-03 17:00:00+07:00').setUtcOffset('+00:00').format()).toBe(
      moment('2023-03-03 13:00:00').utcOffset(0).format(DATE_BASE_FORMAT),
    );
    expect(new DateTimestamp('2023-03-03 17:00:00+07:00').setUtcOffset('-05:00').format()).toBe(
      moment('2023-03-03 13:00:00').utcOffset('-05:00').format(DATE_BASE_FORMAT),
    );
    expect(new DateTimestamp('2023-03-03 07:00:00+07:00').setUtcOffset('+00:00').getUtcOffset()).toBe(0);
    expect(new DateTimestamp('2023-03-03 07:00:00+07:00').setUtcOffset('+00:00').format()).toBe(
      '2023-03-03T00:00:00+00:00',
    );
  });

  it(DateTimestamp.prototype.modify.name, async () => {
    expect(new DateTimestamp().modify('+1day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(1, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(new DateTimestamp().modify('+1 day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(1, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );

    expect(new DateTimestamp().modify('-1day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(-1, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(new DateTimestamp().modify('-1 day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(-1, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );

    expect(new DateTimestamp().modify('+3months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(3, 'months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(
      new DateTimestamp().modify('+3 months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    ).toStrictEqual(moment().add(3, 'months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT));

    expect(new DateTimestamp().modify('-3months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(-3, 'months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(
      new DateTimestamp().modify('-3 months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    ).toStrictEqual(moment().add(-3, 'months').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT));

    expect(new DateTimestamp().modify('+10years').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toStrictEqual(
      moment().add(10, 'years').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(
      new DateTimestamp().modify('+10 years').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    ).toStrictEqual(moment().add(10, 'years').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT));

    expect(
      new DateTimestamp('tomorrow').modify('-1year').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    ).toStrictEqual(moment().add(1, 'day').add(-1, 'year').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT));
    expect(
      new DateTimestamp('tomorrow').modify('-1 years').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    ).toStrictEqual(moment().add(1, 'day').add(-1, 'years').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT));

    expect(
      new DateTimestamp('2023-12-12 15:15:15', UTC_OFFSET).modify('-1 hour').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-12-12 14:15:15');
    expect(
      new DateTimestamp('2023-12-12 15:15:15', UTC_OFFSET).modify('-1 hours').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-12-12 14:15:15');

    expect(
      new DateTimestamp('2023-12-12 15:15:15', UTC_OFFSET).modify('-1 minute').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-12-12 15:14:15');
    expect(
      new DateTimestamp('2023-12-12 15:15:15', UTC_OFFSET).modify('-1 minutes').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-12-12 15:14:15');

    expect(
      new DateTimestamp('2023-12-12 15:15:15', UTC_OFFSET).modify('-1 second').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-12-12 15:15:14');
    expect(
      new DateTimestamp('2023-12-12 15:15:15', UTC_OFFSET).modify('-1 seconds').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    ).toBe('2023-12-12 15:15:14');

    const nowDateTimestamp = new DateTimestamp();
    const nowMillisecond = Number(nowDateTimestamp.format(TIME_MILLISECOND_FORMAT));
    const tgtMillisecond = Number(nowDateTimestamp.modify('+200 millisecond').format(TIME_MILLISECOND_FORMAT));

    expect(
      nowMillisecond + 200 > MILLISECONDS_IN_SECOND
        ? nowMillisecond + 200 - MILLISECONDS_IN_SECOND
        : nowMillisecond + 200,
    ).toBe(tgtMillisecond);

    expect(new DateTimestamp('now').format(DATE_TIME_WORLD_STANDARD_FORMAT)).toStrictEqual(
      moment().format(DATE_TIME_WORLD_STANDARD_FORMAT),
    );
    expect(new DateTimestamp('today').format(DATE_TIME_WORLD_STANDARD_FORMAT)).toStrictEqual(
      moment().format(DATE_TIME_WORLD_STANDARD_FORMAT),
    );
    expect(new DateTimestamp('yesterday').format(DATE_TIME_WORLD_STANDARD_FORMAT)).toStrictEqual(
      moment().add(-1, 'day').format(DATE_TIME_WORLD_STANDARD_FORMAT),
    );
  });

  it(DateTimestamp.prototype.setTimeToStartDay.name, async () => {
    expect(
      new DateTimestamp('tomorrow')
        .setTimeToStartDay()
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    ).toStrictEqual(
      moment()
        .add(1, 'day')
        .set('hour', 0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0)
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    );

    expect(
      new DateTimestamp('yesterday')
        .setTimeToStartDay()
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    ).toStrictEqual(
      moment()
        .add(-1, 'day')
        .set('hour', 0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0)
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    );
  });

  it(DateTimestamp.prototype.setTimeToEndDay.name, async () => {
    expect(
      new DateTimestamp('tomorrow')
        .setTimeToEndDay()
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    ).toStrictEqual(
      moment()
        .add(1, 'day')
        .set('hour', 23)
        .set('minute', 59)
        .set('second', 59)
        .set('millisecond', 999)
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    );

    expect(
      new DateTimestamp('yesterday')
        .setTimeToEndDay()
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    ).toStrictEqual(
      moment()
        .add(-1, 'day')
        .set('hour', 23)
        .set('minute', 59)
        .set('second', 59)
        .set('millisecond', 999)
        .format(`${DATE_TIME_WORLD_STANDARD_FORMAT}.${TIME_MILLISECOND_FORMAT}`),
    );
  });

  it(DateTimestamp.prototype.diff.name, async () => {
    expect(Math.round(new DateTimestamp().diff(new DateTimestamp()) / MILLISECONDS_IN_SECOND)).toBeGreaterThanOrEqual(
      0,
    );

    expect(
      Math.round(new DateTimestamp().diff(new DateTimestamp('tomorrow')) / MILLISECONDS_IN_SECOND),
    ).toBeLessThanOrEqual(-86400);

    expect(
      Math.round(new DateTimestamp().diff(new DateTimestamp('yesterday')) / MILLISECONDS_IN_SECOND),
    ).toBeGreaterThanOrEqual(86400);

    expect(
      Math.round(new DateTimestamp().diff(new DateTimestamp('tomorrow')) / MILLISECONDS_IN_SECOND),
    ).toBeLessThanOrEqual(Math.round(moment().diff(moment().add(1, 'day')) / MILLISECONDS_IN_SECOND));

    expect(Math.round(new DateTimestamp().diff(new DateTimestamp('tomorrow'), undefined, 'years'))).toBeLessThanOrEqual(
      Math.round(moment().diff(moment().add(1, 'day'), 'years')),
    );

    expect(
      Math.round(new DateTimestamp().diff(new DateTimestamp('tomorrow').getMoment(), undefined, 'years')),
    ).toBeLessThanOrEqual(Math.round(moment().diff(moment().add(1, 'day'), 'years')));

    expect(
      Math.round(new DateTimestamp().diff(new DateTimestamp('tomorrow'), undefined, 'months')),
    ).toBeLessThanOrEqual(Math.round(moment().diff(moment().add(1, 'day'), 'months')));

    expect(
      Math.round(new DateTimestamp().diff(new DateTimestamp('tomorrow').getMoment(), undefined, 'months')),
    ).toBeLessThanOrEqual(Math.round(moment().diff(moment().add(1, 'day'), 'months')));
  });

  it(DateTimestamp.prototype.clone.name, async () => {
    const dt1 = new DateTimestamp();
    const dt2 = dt1.clone().modify('+1 day');

    expect(dt1.isValid()).toBeTruthy();
    expect(dt1.format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toBe(
      moment().format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(dt2.format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toBe(
      moment().add(1, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );

    const dt3 = new DateTimestamp().modify('+3 day');
    const dt4 = dt3.clone().modify('+1 day');

    expect(dt3.format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toBe(
      moment().add(3, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(dt4.format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toBe(
      moment().add(4, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );

    const dt5 = new DateTimestamp().modify('+5 day');
    const dt6 = dt5.clone().setUtcOffset(420).modify('+1 day');

    expect(dt5.format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toBe(
      moment().add(5, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
    expect(dt6.format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT)).toBe(
      moment.tz('Asia/Tomsk').add(6, 'day').format(DATE_TIME_WORLD_STANDARD_WITHOUT_SECOND_FORMAT),
    );
  });

  it(DateTimestamp.prototype.getUnix.name, async () => {
    const dt = new DateTimestamp(new Date('2023-11-16'));

    expect(dt.getUnix()).toEqual(1700092800000);
  });

  it(DateTimestamp.prototype.getTimestamp.name, async () => {
    const dt = new DateTimestamp(new Date('2023-11-16 00:00:00.125'));

    expect(dt.getTimestamp()).toEqual(1700082000125);
  });

  it('Throwable', async () => {
    let caught = false;

    try {
      new DateTimestamp(null);
    } catch {
      caught = true;
    }

    expect(caught).toBeTruthy();

    caught = false;
    let dt: DateTimestamp;

    try {
      dt = new DateTimestamp(null, undefined, false);
    } catch {
      caught = true;
    }

    expect(caught).toBeFalsy();
    expect(dt.isValid()).toBeFalsy();

    expect(() => new DateTimestamp('01.01.2024+07')).toThrow(
      new Error(`${DateTimestampErrorMessages.dateTimeUndefined} (01.01.2024+07)`),
    );

    expect(new DateTimestamp('01.01.2024+07', undefined, false).format()).toBe(DateTimestampErrorMessages.invalidDate);

    expect(new DateTimestamp('01.01.2024 10:00:17+7', undefined, false).format()).toBe('2024-01-01T07:00:17+00:00');
  });

  it('Проверка високосного года', async () => {
    // 1 год к 29 февраля
    const src290224 = new DateTimestamp('2024-02-29 00:00:00');
    const tgt280225 = src290224.clone().modify('1 year');

    expect(tgt280225.format(DATE_TIME_WORLD_STANDARD_FORMAT)).toBe('2025-02-28 00:00:00');

    // 1 месяц к 31 января в високосном году
    const src310124 = new DateTimestamp('2024-01-31 00:00:00');
    const tgt290224 = src310124.clone().modify('1 month');

    expect(tgt290224.format(DATE_TIME_WORLD_STANDARD_FORMAT)).toBe('2024-02-29 00:00:00');

    // 4 года к 29 февраля
    const tgt290228 = src290224.clone().modify('4 year');
    expect(tgt290228.format(DATE_TIME_WORLD_STANDARD_FORMAT)).toBe('2028-02-29 00:00:00');

    // 1 год 1 марта, если результирующий год високосный
    const src010323 = new DateTimestamp('2023-03-01 00:00:00');
    const tgt010324 = src010323.clone().modify('1 year');

    expect(tgt010324.format(DATE_TIME_WORLD_STANDARD_FORMAT)).toBe('2024-03-01 00:00:00');
  });
});
