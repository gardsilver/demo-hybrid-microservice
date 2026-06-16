import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth';
import { CommonApiModule } from 'src/core/api/common';
import { HttpApiService } from './services/http-api.service';
import { HttpApiController } from './controllers/http.api.controller';
import { HttpApiAuthController } from './controllers/http.api.auth.controller';

@Module({
  imports: [AuthModule, CommonApiModule],
  providers: [HttpApiService],
  controllers: [HttpApiController, HttpApiAuthController],
})
export class HttpApiModule {}
