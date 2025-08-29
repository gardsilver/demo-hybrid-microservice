import { ApiProperty } from '@nestjs/swagger';

export class RequestOptions {
  @ApiProperty({
    type: 'number',
    required: false,
    description: 'Длительность ожидания ответа (в mc).',
    example: 5000,
  })
  timeout?: number;
}
export class RetryOptions {
  @ApiProperty({
    type: 'boolean',
    required: false,
    description: 'Сделать повторный запрос при недоступности сервиса.',
    example: true,
  })
  retry?: boolean;

  @ApiProperty({
    type: 'number',
    required: false,
    description: 'Ограничить общую длительность выполнения повторных запросов (в mc).',
    example: 30000,
  })
  timeout?: number;

  @ApiProperty({
    type: 'number',
    required: false,
    description: 'Длительность паузы между повторными запросами (в mc).',
    example: 5000,
  })
  delay?: number;
  @ApiProperty({
    type: 'number',
    required: false,
    description: 'Сделать не более заданного количества повторных запросов.',
    example: 5,
  })
  retryMaxCount?: number;
}

export class BaseRequest {
  @ApiProperty({ type: RequestOptions, required: false })
  requestOptions?: RequestOptions;

  @ApiProperty({ type: RetryOptions, required: false })
  retryOptions?: RetryOptions;
}

export class SearchResponse {
  @ApiProperty({ type: 'string', required: false })
  status?: string | undefined;

  @ApiProperty({ type: 'string', required: false })
  message?: string | undefined;
}
