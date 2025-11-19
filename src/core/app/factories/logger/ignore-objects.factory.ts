import { Injectable } from '@nestjs/common';
import { CheckObjectsType } from 'src/modules/common';

@Injectable()
export class IgnoreObjectsFactory {
  constructor() {}

  getCheckObjects(): CheckObjectsType[] {
    return [];
  }
}
