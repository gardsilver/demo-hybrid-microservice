import { Module } from '@nestjs/common';
import { HttpApiService } from './services/http-api.service';
import { HttpApiController } from './controllers/http.api.controller';

@Module({
  providers: [HttpApiService],
  controllers: [HttpApiController],
})
export class HttpApiModule {}
