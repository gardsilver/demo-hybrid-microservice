import { faker } from '@faker-js/faker';
import { CRYPTO_MOCK } from 'tests/crypto';
import { MockCertificateService } from './mock.certificate.service';

jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), ...jest.requireActual('tests/crypto').CRYPTO_MOCK }));

describe(MockCertificateService.name, () => {
  let service: MockCertificateService;
  const mockUuid = faker.string.uuid();

  beforeAll(async () => {
    CRYPTO_MOCK.randomUUID.mockImplementation(() => mockUuid);
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
