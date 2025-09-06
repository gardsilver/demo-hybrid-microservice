import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import { IHeaders } from 'src/modules/common';

export interface IResponse {
  status?: HttpStatus;
  headers?: IHeaders;
}

export class MockResponse {
  public statusCode: HttpStatus;
  private _headers: IHeaders;

  constructor(options?: IResponse) {
    this.statusCode = options?.status;
    this._headers = options?.headers ?? {};
  }

  public getHeaders(): IHeaders {
    return this._headers;
  }

  public setHeader(name: string, value: string | string[]): Response {
    this._headers[name] = value;

    return this as undefined as Response;
  }

  public header(name: string): string | string[] {
    return name in this._headers ? this._headers[name] : undefined;
  }

  public status(status: HttpStatus): Response {
    this.statusCode = status;

    return this as undefined as Response;
  }

  public getStatus(): HttpStatus {
    return this.statusCode;
  }

  public send() {}
}
