/* eslint-disable @typescript-eslint/no-explicit-any */
export class MockSequelize {
  private dialect: string = 'postgres';

  async authenticate(): Promise<void> {}
  async query(_sql?: string): Promise<any> {}
  getQueryInterface() {}
  getDialect(): string {
    return this.dialect;
  }
  setDialect(dialect: string): void {
    this.dialect = dialect;
  }
}
export const mockSequelize = new MockSequelize();
export { SEQUELIZE_TYPESCRIPT_MOCK } from './mocks/mock.sequelize-typescript-module';
