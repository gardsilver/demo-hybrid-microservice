import { ApiProperty } from '@nestjs/swagger';

export class KafkaSearchRequest {
  @ApiProperty({ type: 'string', required: true, example: 'Петр' })
  query!: string;
}
