import { Injectable } from '@nestjs/common';
import { CheckObjectsType } from 'src/modules/common';

@Injectable()
export class IgnoreObjectsService {
  constructor() {}

  getCheckObjects(): CheckObjectsType[] {
    return [];
  }
}
