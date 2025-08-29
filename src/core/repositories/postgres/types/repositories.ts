import { Provider } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { UserModel } from '../models/user.model';

export const REPOSITORIES: Provider[] = [
  {
    provide: getModelToken(UserModel),
    useValue: UserModel,
  },
];
