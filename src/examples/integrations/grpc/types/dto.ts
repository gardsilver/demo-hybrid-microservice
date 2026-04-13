import { ApiProperty } from '@nestjs/swagger';
import { BaseRequest } from 'src/examples/integrations/common';

export class GrpcSearchRequest extends BaseRequest {
  @ApiProperty({ type: 'string', required: true, example: 'Петр' })
  query!: string;
}
