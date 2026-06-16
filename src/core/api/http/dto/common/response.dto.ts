import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export class ResponseDto {
  @IsEnum(ResponseStatus)
  @IsNotEmpty()
  public readonly status!: ResponseStatus;

  @IsString()
  @IsOptional()
  public readonly message?: string;

  constructor(status: ResponseStatus, message?: string) {
    this.status = status;
    this.message = message;
  }

  public static success(message?: string): ResponseDto {
    return new ResponseDto(ResponseStatus.SUCCESS, message);
  }

  public static error(message: string): ResponseDto {
    return new ResponseDto(ResponseStatus.ERROR, message);
  }
}
