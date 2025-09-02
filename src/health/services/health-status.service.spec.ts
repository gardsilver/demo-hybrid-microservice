import { HealthImplementation } from 'grpc-health-check';
import { HealthStatusService } from './health-status.service';

describe(HealthStatusService.name, () => {
  let grpcServices: string[];
  let grpcHealthImpl: HealthImplementation;
  let service: HealthStatusService;

  beforeEach(async () => {
    const initialStatusMap = {};

    grpcServices = ['TestService'];
    grpcServices.forEach((service) => {
      initialStatusMap[service] = 'UNKNOWN';
    });
    grpcHealthImpl = new HealthImplementation(initialStatusMap);
    service = new HealthStatusService();
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(service['grpcHealthImpl']).toBeUndefined();
    expect(service['grpcServices']).toBeUndefined();

    service.addGrpcHealthImplementation(grpcHealthImpl, grpcServices);

    expect(service['grpcHealthImpl']).toEqual(grpcHealthImpl);
    expect(service['grpcServices']).toEqual(grpcServices);
  });

  it('beforeDestroy', () => {
    const spy = jest.spyOn(grpcHealthImpl, 'setStatus');

    service.beforeDestroy();
    expect(spy).toHaveBeenCalledTimes(0);

    service.addGrpcHealthImplementation(grpcHealthImpl, []);

    service.beforeDestroy();
    expect(spy).toHaveBeenCalledTimes(0);

    service.addGrpcHealthImplementation(grpcHealthImpl, grpcServices);

    service.beforeDestroy();
    expect(spy).toHaveBeenCalledWith('TestService', 'NOT_SERVING');
  });
});
