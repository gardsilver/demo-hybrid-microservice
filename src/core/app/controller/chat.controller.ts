import { Controller, Render, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipInterceptors } from 'src/modules/common';

@SkipInterceptors({ HttpAuthGuard: true })
@ApiTags('chat')
@Controller()
export class ChatController {
  @Get('/chat')
  @Render('index')
  home() {}
}
