import * as fs from 'fs';
import { sep } from 'path';
import { GrpcProtoPathHelper } from './grpc.proto-path.helper';

describe(GrpcProtoPathHelper.name, () => {
  beforeEach(async () => {
    jest.resetAllMocks();
  });

  it('existPaths', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
      if (path == 'tmp') {
        return false;
      }

      return true;
    });

    expect(() => GrpcProtoPathHelper.existPaths('log.log')).not.toThrow(
      Error('ProtoPathHelper: path is not exist! (tmp).'),
    );
    expect(() => GrpcProtoPathHelper.existPaths(['log.log'])).not.toThrow(
      Error('ProtoPathHelper: path is not exist! (tmp).'),
    );
    expect(() => GrpcProtoPathHelper.existPaths(['log.log', 'test'])).not.toThrow(
      Error('ProtoPathHelper: path is not exist! (tmp).'),
    );
    expect(() => GrpcProtoPathHelper.existPaths('tmp')).toThrow(Error('ProtoPathHelper: path is not exist! (tmp).'));
    expect(() => GrpcProtoPathHelper.existPaths(['log.log', 'tmp'])).toThrow(
      Error('ProtoPathHelper: path is not exist! (tmp).'),
    );
  });

  it('joinBase', async () => {
    expect(GrpcProtoPathHelper.joinBase('baseDir', 'log.log')).toEqual([`baseDir${sep}log.log`]);
    expect(GrpcProtoPathHelper.joinBase(`baseDir${sep}`, 'log.log')).toEqual([`baseDir${sep}log.log`]);
    expect(GrpcProtoPathHelper.joinBase(`baseDir${sep}`, `${sep}log.log`)).toEqual([`baseDir${sep}log.log`]);
    expect(GrpcProtoPathHelper.joinBase('baseDir', `${sep}log.log`)).toEqual([`baseDir${sep}log.log`]);
    expect(GrpcProtoPathHelper.joinBase('baseDir', ['log.log', 'tmp.log'])).toEqual([
      `baseDir${sep}log.log`,
      `baseDir${sep}tmp.log`,
    ]);
    expect(GrpcProtoPathHelper.joinBase('baseDir', [`baseDir${sep}log.log`, 'baseDirNext.tmp.log'])).toEqual([
      `baseDir${sep}log.log`,
      `baseDir${sep}baseDirNext.tmp.log`,
    ]);

    expect(
      GrpcProtoPathHelper.joinBase(`${sep}baseDir${sep}logs${sep}`, [
        `${sep}tmpDir${sep}log.log`,
        `baseDir${sep}logs${sep}log.log`,
      ]),
    ).toEqual([`${sep}baseDir${sep}logs${sep}tmpDir${sep}log.log`, `${sep}baseDir${sep}logs${sep}log.log`]);
  });
});
