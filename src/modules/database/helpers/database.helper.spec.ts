import { DataType, Model } from 'sequelize-typescript';
import { DatabaseHelper } from './database.helper';

class Post {
  constructor(public message: string) {}

  static [Symbol.hasInstance](instance): boolean {
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
    expect(DatabaseHelper.modelToLogFormat({ message: 'Hello word' })).toEqual({ message: 'Hello word' });
  });

  it('getAttributesName', async () => {
    expect(DatabaseHelper.getAttributesName(Post)).toEqual({ message: 'message' });
    expect(DatabaseHelper.getAttributesName(null)).toEqual({});
    expect(DatabaseHelper.getAttributesName({ message: 'Hello word' })).toEqual({});
  });
});
