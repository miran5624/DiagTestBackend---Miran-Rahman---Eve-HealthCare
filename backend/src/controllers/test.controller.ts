import { Request, Response } from 'express';
import { prisma } from '../app';

export class TestController {
  async getTests(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const q = req.query.q as string;

    const where: import('@prisma/client').Prisma.DiagnosticTestWhereInput = {};
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      prisma.diagnosticTest.count({ where }),
      prisma.diagnosticTest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      })
    ]);

    res.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}
