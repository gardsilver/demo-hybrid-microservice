import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

@Injectable()
export class RedisCacheInstanceService {
  private static instance: RedisCacheService;

  constructor(private readonly redisCacheService: RedisCacheService) {
    RedisCacheInstanceService.instance = redisCacheService;
  }

  public static getInstance(): RedisCacheService {
    return RedisCacheInstanceService.instance;
  }
}
