import { Controller, Render, Get } from '@nestjs/common';
import { SkipInterceptors } from 'src/modules/common';

@SkipInterceptors({ HttpAuthGuard: true })
@Controller()
export class AppController {
  @Get('/chat')
  @Render('index')
  home() {}
}
