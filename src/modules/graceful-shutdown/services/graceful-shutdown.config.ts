import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS } from '../types/constants';

@Injectable()
export class GracefulShutdownConfig {
  private readonly isEnabled: boolean;
  private readonly timeoutBeforeDestroy: string;
  private readonly timeoutDestroy: string;
  private readonly timeoutAfterDestroy: string;
  private readonly gracePeriod: string;
  private readonly destroySignal: string;

  constructor(configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService, 'GRACEFUL_SHUTDOWN_');

    this.isEnabled = configServiceHelper.parseBoolean('ENABLED');

    this.timeoutBeforeDestroy = configService
      .get(configServiceHelper.getKeyName('TIMEOUT_ON_BEFORE_DESTROY'), '')
      .trim();
    this.timeoutDestroy = configService.get(configServiceHelper.getKeyName('TIMEOUT_ON_DESTROY'), '').trim();
    this.timeoutAfterDestroy = configService.get(configServiceHelper.getKeyName('TIMEOUT_ON_AFTER_DESTROY'), '').trim();
    this.gracePeriod = configService.get(configServiceHelper.getKeyName('GRACE_PERIOD'), '').trim();
    this.destroySignal = configService.get(configServiceHelper.getKeyName('DESTROY_SIGNAL'), 'SIGTERM').trim();

    if (
      ![
        'SIGABRT',
        'SIGALRM',
        'SIGBUS',
        'SIGCHLD',
        'SIGCONT',
        'SIGFPE',
        'SIGHUP',
        'SIGILL',
        'SIGINT',
        'SIGIO',
        'SIGIOT',
        'SIGKILL',
        'SIGPIPE',
        'SIGPOLL',
        'SIGPROF',
        'SIGPWR',
        'SIGQUIT',
        'SIGSEGV',
        'SIGSTKFLT',
        'SIGSTOP',
        'SIGSYS',
        'SIGTERM',
        'SIGTRAP',
        'SIGTSTP',
        'SIGTTIN',
        'SIGTTOU',
        'SIGUNUSED',
        'SIGURG',
        'SIGUSR1',
        'SIGUSR2',
        'SIGVTALRM',
        'SIGWINCH',
        'SIGXCPU',
        'SIGXFSZ',
        'SIGBREAK',
        'SIGLOST',
        'SIGINFO',
      ].includes(this.destroySignal)
    ) {
      configServiceHelper.error(configServiceHelper.getKeyName('DESTROY_SIGNAL'), this.destroySignal);
    }
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  getTimeoutBeforeDestroy(): number {
    return this.timeoutBeforeDestroy === ''
      ? GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutBeforeDestroy
      : Number(this.timeoutBeforeDestroy);
  }

  getTimeoutDestroy(): number {
    return this.timeoutDestroy === '' ? GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutDestroy : Number(this.timeoutDestroy);
  }

  getTimeoutAfterDestroy(): number {
    return this.timeoutAfterDestroy === ''
      ? GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.timeoutAfterDestroy
      : Number(this.timeoutAfterDestroy);
  }

  getGracePeriod(): number {
    return this.gracePeriod === '' ? GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS.gracePeriod : Number(this.gracePeriod);
  }

  getDestroySignal(): string {
    return this.destroySignal;
  }
}
