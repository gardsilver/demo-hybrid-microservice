import * as crypto from 'crypto';
import { faker } from '@faker-js/faker';
import { MockCertificateService } from './mock.certificate.service';

describe(MockCertificateService.name, () => {
  let service: MockCertificateService;
  const mockUuid = faker.string.uuid();

  beforeAll(async () => {
    jest.spyOn(crypto, 'randomUUID').mockImplementation(() => mockUuid as undefined as crypto.UUID);
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('default', async () => {
    service = new MockCertificateService();

    expect(await service.getCert()).toEqual(mockUuid);
  });

  it('custom default', async () => {
    service = new MockCertificateService({ useCertificate: false });

    expect(await service.getCert()).toEqual(mockUuid);
  });

  it('custom', async () => {
    const useCert = faker.string.uuid();

    service = new MockCertificateService({ useCertificate: useCert });

    expect(useCert).not.toEqual(mockUuid);
    expect(await service.getCert()).toEqual(useCert);
  });
});
