import { Injectable } from '@nestjs/common';
import { IUser } from 'src/core/repositories/postgres';
import { UserService } from 'src/core/repositories/postgres';

@Injectable()
export class GrpcApiService {
  constructor(private readonly userService: UserService) {}

  public async getUser(query: string): Promise<IUser> {
    return this.userService.findUser({
      name: query,
    });
  }
}
