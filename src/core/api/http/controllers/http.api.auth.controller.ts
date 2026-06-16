import { Controller, Post, Body, Inject, HttpCode, HttpStatus, HttpException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { AUTH_SERVICE_DI, IAccessTokenData, AccessRoles, IAuthService } from 'src/modules/auth';
import { CommonApiService } from 'src/core/api/common';

import { ResponseDto } from '../dto/common/response.dto';
import { LoginRequestDto } from '../dto/auth/login.dto';
import { HttpAuthGuard } from 'src/modules/http/http-server';
import { SkipInterceptors } from 'src/modules/common';
import { AUTHORIZATION_HEADER_NAME, BEARER_NAME } from 'src/modules/http/http-common';

@SkipInterceptors(HttpAuthGuard)
@ApiTags('Сессия и Аутентификация')
@Controller('auth')
export class HttpApiAuthController {
  private readonly hasAdminRole = [1];

  constructor(
    @Inject(AUTH_SERVICE_DI)
    private readonly authService: IAuthService,
    private readonly service: CommonApiService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Авторизация пользователя в демо-приложении',
    description: 'Проверяет наличие никнейма в базе данных и инициализирует сессию.',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Пользователь успешно найден в БД, сессия разрешена.',
    type: ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Доступ запрещен. Указанный никнейм отсутствует в базе данных.',
    type: ResponseDto,
  })
  public async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ResponseDto> {
    const username = body.username?.trim();
    const user = await this.service.getUser(username);

    if (!user) {
      throw new HttpException(ResponseDto.error(`Не верный логин или пароль.`), HttpStatus.FORBIDDEN);
    }

    const role = this.hasAdminRole.includes(user.id || 0) ? AccessRoles.ADMIN : AccessRoles.USER;

    const accessTokenData: IAccessTokenData = {
      roles: [role],
    };

    const accessToken = this.authService.getJwtToken(accessTokenData);
    const cookieValue = encodeURIComponent(`${BEARER_NAME} ${accessToken}`);

    response.cookie(AUTHORIZATION_HEADER_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return ResponseDto.success(`Пользователь '${username}' успешно авторизован`);
  }
}
