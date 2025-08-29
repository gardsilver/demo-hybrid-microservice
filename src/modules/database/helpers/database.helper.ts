import { Model } from 'sequelize-typescript';
import { Type } from '@nestjs/common';
import { IKeyValue, isStaticMethod } from 'src/modules/common';

export class DatabaseHelper {
  public static modelToLogFormat(model: object) {
    return model && model instanceof Model ? model?.toJSON() : model;
  }

  public static getAttributesName(modelType: Type | object): IKeyValue<string> {
    const attributes = isStaticMethod(modelType, 'getAttributes') ? modelType['getAttributes']() : {};
    const fields: IKeyValue<string> = {};

    for (const atr in attributes) {
      fields[atr] = attributes[atr]?.field ?? atr;
    }

    return fields;
  }
}
