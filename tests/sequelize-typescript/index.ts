/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
export class MockSequelize {
  async authenticate(): Promise<void> {}
  async query(sql?: string): Promise<any> {}
  getQueryInterface() {}
}
export const mockSequelize = new MockSequelize();
