import { Observable } from 'rxjs';
import { ArgumentsHost, Catch, ExceptionFilter, RpcExceptionFilter } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';
import { HttpErrorResponseFilter } from 'src/modules/http/http-server';
import { GrpcErrorResponseFilter, GrpcHelper } from 'src/modules/grpc/grpc-server';
import { KafkaErrorFilter, KafkaServerHelper } from 'src/modules/kafka/kafka-server';
import { RabbitMqErrorFilter, RabbitMqHelper } from 'src/modules/rabbit-mq/rabbit-mq-server';

@Catch()
export class HybridErrorResponseFilter implements ExceptionFilter, RpcExceptionFilter {
  private readonly defaultRpcExceptionFilter: BaseRpcExceptionFilter;
  constructor(
    private readonly httpErrorResponseFilter: HttpErrorResponseFilter,
    private readonly grpcErrorResponseFilter: GrpcErrorResponseFilter,
    private readonly kafkaErrorFilter: KafkaErrorFilter,
    private readonly rabbitMqErrorFilter: RabbitMqErrorFilter,
  ) {
    this.defaultRpcExceptionFilter = new BaseRpcExceptionFilter();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost): any | Observable<any> {
    if (host.getType() === 'http') {
      this.httpErrorResponseFilter.catch(exception, host);

      return;
    }

    if (GrpcHelper.isGrpc(host)) {
      return this.grpcErrorResponseFilter.catch(exception, host);
    }

    if (KafkaServerHelper.isKafka(host)) {
      return this.kafkaErrorFilter.catch(exception, host);
    }

    if (RabbitMqHelper.isRabbitMq(host)) {
      return this.rabbitMqErrorFilter.catch(exception, host);
    }

    if (host.getType() === 'rpc') {
      return this.defaultRpcExceptionFilter.catch(exception, host);
    }

    return;
  }
}
