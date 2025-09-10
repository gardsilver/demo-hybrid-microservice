import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { AuthModule } from 'src/modules/auth';
import { GrpcServerModule } from 'src/modules/grpc/grpc-server';
import { HttpServerModule } from 'src/modules/http/http-server';
import { HybridServerModule, HybridErrorResponseFilter } from './';

describe(HybridServerModule.name, () => {
  let filter: HybridErrorResponseFilter;

  describe('default', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          ElkLoggerModule.forRoot(),
          AuthModule.forRoot(),
          HttpServerModule.forRoot(),
          GrpcServerModule.forRoot(),
          HybridServerModule,
        ],
      }).compile();

      filter = module.get(HybridErrorResponseFilter);
    });

    it('init', async () => {
      expect(filter).toBeDefined();
    });
  });
});
