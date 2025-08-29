import { ApiProperty } from '@nestjs/swagger';
import { BaseRequest } from 'src/examples/integrations/common';

export class SearchRequest extends BaseRequest {
  @ApiProperty({ type: 'string', required: true, example: 'Петр' })
  query: string;
}
