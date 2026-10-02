/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../app';
import { Prisma } from '@prisma/client';

export class BookingRepository {
  async create(data: Prisma.BookingCreateInput) {
    return prisma.booking.create({ data });
  }

  async findById(id: string) {
    return prisma.booking.findUnique({ 
      where: { id }, 
      include: { 
        centreTest: { include: { centre: true, test: true } } 
      } 
    });
  }

  async findByUserId(userId: string, status?: string, skip?: number, take?: number) {
    const where = status ? { userId, status: status as any } : { userId };
    return prisma.booking.findMany({ 
      where, 
      skip, 
      take, 
      orderBy: { createdAt: 'desc' },
      include: { 
        centreTest: { include: { centre: true, test: true } } 
      }
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.booking.update({ where: { id }, data: { status: status as any } });
  }
}

export class CentreTestRepository {
  async findByCentreAndTest(centreId: string, testId: string) {
    return prisma.centreTest.findUnique({
      where: { centreId_testId: { centreId, testId } }
    });
  }
}
