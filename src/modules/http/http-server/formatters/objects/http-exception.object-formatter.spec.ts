import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFormatter } from './http-exception.object-formatter';

describe(HttpExceptionFormatter.name, () => {
  let formatter: HttpExceptionFormatter;

  beforeEach(async () => {
    formatter = new HttpExceptionFormatter();
  });

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat('')).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(new HttpException('Tets error', HttpStatus.BAD_REQUEST))).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(new HttpException('Tets error', HttpStatus.BAD_REQUEST))).toEqual({
      status: HttpStatus.BAD_REQUEST,
      response: 'Tets error',
    });
  });
});
