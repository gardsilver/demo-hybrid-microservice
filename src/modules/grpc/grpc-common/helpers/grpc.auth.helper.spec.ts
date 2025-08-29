import { HttpAuthHelper } from 'src/modules/http/http-common';
import { GrpcAuthHelper } from './grpc.auth.helper';

describe(GrpcAuthHelper.name, () => {
  it('default', async () => {
    const spyParent = jest.spyOn(HttpAuthHelper, 'token');

    GrpcAuthHelper.token({});

    expect(spyParent).toHaveBeenCalledWith({});
  });
});
