import { Injectable } from '@nestjs/common';
import { ILogRecordFormatter } from 'src/modules/elk-logger';
import { GeneralAsyncContextFormatter } from 'src/modules/common/formatters';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';

@Injectable()
export class FormattersFactory {
  constructor(
    protected readonly generalAsyncContextFormatter: GeneralAsyncContextFormatter,
    protected readonly httpSecurityHeadersFormatter: HttpSecurityHeadersFormatter,
  ) {}

  getFormatters(): ILogRecordFormatter[] {
    return [this.generalAsyncContextFormatter, this.httpSecurityHeadersFormatter];
  }
}
