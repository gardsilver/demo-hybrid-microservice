export interface IIdentityUser {
  id?: number;
  name: string;
}

export interface IUser extends IIdentityUser {
  id?: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
}
