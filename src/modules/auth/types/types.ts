export interface AuthModuleOptions {
  useCertificate?: false | string;
}

export enum AccessRoles {
  USER = 'user',
  ADMIN = 'admin',
}

export interface IAccessTokenData {
  roles?: AccessRoles[];
}

export enum AuthStatus {
  SUCCESS = 'success',
  TOKEN_ABSENT = 'tokenAbsent',
  TOKEN_PARSE_ERROR = 'tokenParseError',
  VERIFY_FAILED = 'verifyFailed',
}

export interface IAuthInfo extends IAccessTokenData {
  status: AuthStatus;
}
