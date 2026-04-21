import { Injectable } from '@nestjs/common';
import { ILogRecordFormatter } from 'src/modules/elk-logger';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';

@Injectable()
export class FormattersFactory {
  constructor(protected readonly httpSecurityHeadersFormatter: HttpSecurityHeadersFormatter) {}

  getFormatters(): ILogRecordFormatter[] {
    return [this.httpSecurityHeadersFormatter];
  }
}
