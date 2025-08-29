import { Inject, Injectable } from '@nestjs/common';
import { ILogRecordFormatter, IEncodeFormatter } from '../types/elk-logger.types';
import { PruneEncoder } from './encodes/prune.encoder';
import { CircularFormatter } from './records/circular.formatter';
import { ObjectFormatter } from './records/object.formatter';
import { PruneFormatter } from './records/prune.formatter';
import { SortFieldsFormatter } from './records/sort-fields.formatter';
import { ELK_FEATURE_FORMATTERS_DI, ELK_FEATURE_ENCODERS_DI } from '../types/tokens';

@Injectable()
export class FormattersFactory {
  constructor(
    private readonly circularFormatter: CircularFormatter,
    private readonly objectFormatter: ObjectFormatter,
    private readonly PruneFormatter: PruneFormatter,
    private readonly sortFieldsFormatter: SortFieldsFormatter,
    private readonly pruneEncoder: PruneEncoder,
    @Inject(ELK_FEATURE_FORMATTERS_DI) private readonly featureFormatters: ILogRecordFormatter[],
    @Inject(ELK_FEATURE_ENCODERS_DI) private readonly featureEncoders: IEncodeFormatter[],
  ) {}

  getRecordFormatters(): ILogRecordFormatter[] {
    let formatters: ILogRecordFormatter[] = [this.circularFormatter, this.objectFormatter];

    formatters = formatters.concat(this.featureFormatters);
    formatters = formatters.concat([this.PruneFormatter, this.sortFieldsFormatter]);

    return this.sortFormatters(formatters);
  }

  getEncodeFormatters(): IEncodeFormatter[] {
    return this.sortFormatters(this.featureEncoders.concat([this.pruneEncoder]));
  }

  protected sortFormatters<T extends ILogRecordFormatter | IEncodeFormatter>(formatters: T[]): T[] {
    return formatters.sort((a, b) => {
      const priorityA = typeof a.priority === 'function' ? a.priority() : 0;
      const priorityB = typeof b.priority === 'function' ? b.priority() : 0;

      return priorityA > priorityB ? 1 : priorityA < priorityB ? -1 : 0;
    });
  }
}
