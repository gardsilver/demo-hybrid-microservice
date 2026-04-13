import { Model } from 'sequelize-typescript';
import { Type } from '@nestjs/common';
import { IKeyValue, isStaticMethod } from 'src/modules/common';

export abstract class DatabaseHelper {
  public static modelToLogFormat(model: object | null | undefined) {
    return model && model instanceof Model ? model?.toJSON() : model;
  }

  public static getAttributesName(modelType: Type | object | null | undefined): IKeyValue<string> {
    const attributes = isStaticMethod(modelType, 'getAttributes')
      ? (modelType as unknown as Record<string, () => Record<string, { field?: string }>>)['getAttributes']()
      : {};
    const fields: IKeyValue<string> = {};

    for (const atr in attributes) {
      fields[atr] = attributes[atr]?.field ?? atr;
    }

    return fields;
  }
}
