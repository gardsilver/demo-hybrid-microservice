import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { bootstrap, loadDefaultBootstrapArgs } from './bootstrap';
import { ProcessTraceSpanStore } from './modules/elk-logger';

async function main() {
  const args = loadDefaultBootstrapArgs();

  const tracer = trace.getTracer('application-lifecycle');

  const bootstrapSpan = tracer.startSpan('application_bootstrap', {
    attributes: { 'runtime.node.version': process.version },
  });

  ProcessTraceSpanStore.instance.setBootstrapSpan(bootstrapSpan);

  const bootstrapContext = trace.setSpan(context.active(), bootstrapSpan);

  await context.with(bootstrapContext, async () => {
    try {
      args.logger.log('Starting NestJS application bootstrap steps...');

      await bootstrap(args);

      args.logger.log('Application successfully bootstrapped and ready!');

      bootstrapSpan.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      args.logger.error('Fatal error during application bootstrap', error);

      bootstrapSpan.recordException(error as Error);
      bootstrapSpan.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

      throw error;
    } finally {
      bootstrapSpan.end();
      ProcessTraceSpanStore.instance.clearBootstrapSpan();
    }
  });
}

main();
