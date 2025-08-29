import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ICertificateService } from '../types/interfaces';
import { AuthModuleOptions } from '../types/types';

@Injectable()
export class MockCertificateService implements ICertificateService {
  private certificate: string | null = null;

  constructor(options?: AuthModuleOptions) {
    if (options?.useCertificate && typeof options?.useCertificate === 'string') {
      this.certificate = options.useCertificate;
    }
  }

  public async getCert(): Promise<string> {
    if (this.certificate === null) {
      this.certificate = randomUUID();
    }

    return this.certificate;
  }
}
