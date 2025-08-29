import { Injectable } from '@nestjs/common';

@Injectable()
export class HttpApiService {
  getHello(): string {
    return 'Hello World!';
  }
}
