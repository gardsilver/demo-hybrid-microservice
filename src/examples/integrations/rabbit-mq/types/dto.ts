import { ApiProperty } from '@nestjs/swagger';

export class RabbitMqSearchRequest {
  @ApiProperty({ type: 'string', required: true, example: 'Петр' })
  query!: string;
}
