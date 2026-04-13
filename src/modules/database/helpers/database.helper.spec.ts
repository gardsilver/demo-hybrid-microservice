import { DataType, Model } from 'sequelize-typescript';
import { DatabaseHelper } from './database.helper';

class Post {
  constructor(public message: string) {}

  public static [Symbol.hasInstance](instance: unknown): boolean {
    return instance instanceof Model;
  }

  public toJSON() {
    return { message: this.message };
  }

  public static getAttributes() {
    return {
      message: {
        type: DataType.STRING,
        allowNull: true,
        defaultValue: null,
      },
    };
  }
}

describe(DatabaseHelper.name, () => {
  it('modelToLogFormat', async () => {
    const mockModel = new Post('Hello word');

    expect(DatabaseHelper.modelToLogFormat(mockModel)).toEqual({ message: 'Hello word' });
    expect(DatabaseHelper.modelToLogFormat(null)).toEqual(null);
    expect(DatabaseHelper.modelToLogFormat(undefined)).toEqual(undefined);
    expect(DatabaseHelper.modelToLogFormat({ message: 'Hello word' })).toEqual({ message: 'Hello word' });
  });

  it('getAttributesName', async () => {
    expect(DatabaseHelper.getAttributesName(Post)).toEqual({ message: 'message' });
    expect(DatabaseHelper.getAttributesName(null)).toEqual({});
    expect(DatabaseHelper.getAttributesName({ message: 'Hello word' })).toEqual({});
  });
});
