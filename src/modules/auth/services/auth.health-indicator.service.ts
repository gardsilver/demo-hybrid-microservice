import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { IAuthService } from '../types/interfaces';
import { AUTH_SERVICE_DI } from '../types/tokens';

@Injectable()
export class AuthHealthIndicatorService {
  constructor(
    @Inject(AUTH_SERVICE_DI)
    private readonly authService: IAuthService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isReadiness(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('Certificate');

    if (!this.authService.synchronized()) {
      return indicator.down({ synchronized: false });
    }

    return indicator.up({ synchronized: true });
  }
}
