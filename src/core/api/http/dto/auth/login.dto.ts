// src/core/api/http/dto/auth/login.dto.ts
import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Импортируем ApiProperty

export class LoginRequestDto {
  @ApiProperty({
    description: 'Имя пользователя (никнейм) для проверки в базе данных',
    example: 'admin',
    minLength: 3,
    maxLength: 50,
    required: true,
  })
  @IsString({ message: 'Имя пользователя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя пользователя не может быть пустым' })
  @Length(3, 50, { message: 'Имя пользователя должно содержать от 3 до 50 символов' })
  public readonly username!: string;
}
