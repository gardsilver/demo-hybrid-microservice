import { IAccessTokenData, IAuthInfo } from './types';

export interface ICertificateService {
  getCert(): Promise<string>;
}

export interface IAuthService {
  synchronized(): boolean;

  authenticate(jwtString: string | null): Promise<IAuthInfo>;

  getJwtToken(dataToken: IAccessTokenData): string;
}
