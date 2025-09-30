import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFormatter } from './http-exception.object-formatter';

describe(HttpExceptionFormatter.name, () => {
  let formatter: HttpExceptionFormatter;

  beforeEach(async () => {
    formatter = new HttpExceptionFormatter();
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(new HttpException('Tets error', HttpStatus.BAD_REQUEST))).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(new HttpException('Tets error', HttpStatus.BAD_REQUEST))).toEqual({
      status: HttpStatus.BAD_REQUEST,
      response: 'Tets error',
    });
  });
});
