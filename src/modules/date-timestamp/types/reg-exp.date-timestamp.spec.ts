import { REGEXP_CORRECT_DATE_TIME, REGEXP_WITH_TIMEZONE_OFFSET, STRING_REGEX_TIME_FORMAT } from './constants';

describe('Checks correct date time format', () => {
  it('correct formats', async () => {
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.1900')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('31.12.9999')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.0')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.000')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.10')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.010')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.999')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.0Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.10Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.010Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.999Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.0+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.10+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.010+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 23:59:59.999+07:00')).toBeTruthy();

    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.0')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.000')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.10')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.010')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.999')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.0Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.000Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.10Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.010Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.999Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.0+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.000+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.10+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.010+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T23:59:59.999+07:00')).toBeTruthy();

    expect(REGEXP_CORRECT_DATE_TIME.test('1900-01-01')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('9999-12-31')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.0')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.000')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.10')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.010')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.999')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.0Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.000Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.10Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.010Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.999Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.0+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.000+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.10+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.010+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 23:59:59.999+07:00')).toBeTruthy();

    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.0')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.000')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.10')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.010')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.999')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.0Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.00Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.000Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.10Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.010Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.999Z')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.0+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.00+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.000+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.10+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.010+07:00')).toBeTruthy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T23:59:59.999+07:00')).toBeTruthy();
  });

  it('incorrect formats', async () => {
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.1899')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.30032')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('1.01.2025')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.1.2025')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('32.01.2025')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.13.2025')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025  00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025  00:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 0:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00:00.')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00:00+1272')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00:00+127+7')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00.45')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025 00:00:00.1045')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T 00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025TT00:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T0:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00:00+1272')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00.45')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('01.01.2025T00:00:00.1045')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('1899-01-01')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('30032-01-01')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-1')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-1-01')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-32')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-13-01')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01  00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01  00:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 0:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00:00+1272')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00.45')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01 00:00:00.1045')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T 00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T0:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01TT00:00:00')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T0:00:00')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:0:00')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00:0')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00:00+1272')).toBeFalsy();

    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00:00.')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00.45')).toBeFalsy();
    expect(REGEXP_CORRECT_DATE_TIME.test('2025-01-01T00:00:00.1045')).toBeFalsy();
  });
});

describe('Checks correct date time format', () => {
  describe('STRING_REGEX_TIME_FORMAT', () => {
    const regexp = new RegExp(`^${STRING_REGEX_TIME_FORMAT}$`);

    it('should validate correct time formats', () => {
      expect(regexp.test('00:00')).toBeTruthy();
      expect(regexp.test('23:59')).toBeTruthy();

      expect(regexp.test('00:00:00')).toBeTruthy();
      expect(regexp.test('23:59:59')).toBeTruthy();

      expect(regexp.test('23:59:59.0')).toBeTruthy();
      expect(regexp.test('23:59:59.00')).toBeTruthy();
      expect(regexp.test('23:59:59.000')).toBeTruthy();

      expect(regexp.test('23:59:59.1')).toBeTruthy();
      expect(regexp.test('23:59:59.12')).toBeTruthy();
      expect(regexp.test('23:59:59.123')).toBeTruthy();

      expect(regexp.test('00:00:00.045')).toBeTruthy();
    });

    it('should invalidate incorrect time formats', () => {
      expect(regexp.test('24:00')).toBeFalsy();
      expect(regexp.test('23:60')).toBeFalsy();

      expect(regexp.test('23:59:60')).toBeFalsy();

      expect(regexp.test('0:00')).toBeFalsy();
      expect(regexp.test('00:0')).toBeFalsy();

      expect(regexp.test('23:59:59.')).toBeFalsy();
      expect(regexp.test('23:59:59.1234')).toBeFalsy();

      expect(regexp.test('23:59.123')).toBeFalsy();
    });
  });

  describe('REGEXP_WITH_TIMEZONE_OFFSET', () => {
    it('should validate timezone formats', () => {
      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':00Z')).toBeTruthy();
      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':00.0Z')).toBeTruthy();
      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':00.00Z')).toBeTruthy();
      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':00.000Z')).toBeTruthy();

      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':59+07:00')).toBeTruthy();
      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':59.123+07:00')).toBeTruthy();

      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':59.045-03:00')).toBeTruthy();
    });

    it('should invalidate incorrect timezone formats', () => {
      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':59.1234Z')).toBeFalsy();

      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':59+1272')).toBeFalsy();

      expect(REGEXP_WITH_TIMEZONE_OFFSET.test(':59.')).toBeFalsy();
    });
  });
});
