import { prisma } from '../app';
import { Prisma } from '@prisma/client';

export class UserRepository {
  async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
}
