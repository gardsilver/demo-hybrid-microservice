import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { BufferObjectFormatter } from './buffer.object-formatter';

describe(BufferObjectFormatter.name, () => {
  let context;
  let buffer: Buffer;
  let formatter: BufferObjectFormatter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [BufferObjectFormatter] }).compile();

    formatter = module.get(BufferObjectFormatter);

    context = faker.string.alpha(20);
    buffer = Buffer.from(context);
  });

  it('init', async () => {
    expect(formatter).toBeDefined();
  });

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf(context)).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf([faker.number.int()])).toBeFalsy();
    expect(formatter.isInstanceOf(buffer)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(buffer)).toBe(`[Buffer] ${context}`);
  });
});
