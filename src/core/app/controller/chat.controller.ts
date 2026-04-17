import { Controller, Render, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipInterceptors } from 'src/modules/common';
import { HttpAuthGuard } from 'src/modules/http/http-server';

@SkipInterceptors(HttpAuthGuard)
@ApiTags('chat')
@Controller()
export class ChatController {
  @Get('/chat')
  @Render('index')
  home() {}
}
