import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app';
import { Conflict, NotFound, ValidationError } from '../errors/AppError';

export class CentreController {
  async getCentres(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const city = req.query.city as string;
    const testId = req.query.testId as string;
    const q = req.query.q as string;

    const where: import('@prisma/client').Prisma.DiagnosticCentreWhereInput = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (q) where.name = { contains: q, mode: 'insensitive' };
    if (testId) {
      where.centreTests = { some: { testId, isActive: true } };
    }

    const [total, data] = await Promise.all([
      prisma.diagnosticCentre.count({ where }),
      prisma.diagnosticCentre.findMany({
        where,
        skip,
        take: limit,
        include: {
          centreTests: {
            where: { isActive: true },
            include: { test: true }
          }
        },
        orderBy: { createdAt: 'desc' }
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

  async getCentreById(req: Request, res: Response) {
    const id = req.params.id as string;

    // Check if valid UUID
    const uuidSchema = z.string().uuid();
    const result = uuidSchema.safeParse(id);
    if (!result.success) {
      throw new ValidationError('Malformed UUID');
    }

    const centre = await prisma.diagnosticCentre.findUnique({
      where: { id },
      include: {
        centreTests: {
          where: { isActive: true },
          include: { test: true }
        }
      }
    });

    if (!centre) {
      throw new NotFound('Centre not found');
    }

    res.json(centre);
  }

  async createCentre(req: Request, res: Response) {
    const schema = z.object({
      name: z.string().min(1),
      city: z.string().min(1),
      address: z.string().min(1)
    });

    const data = schema.parse(req.body);
    const centre = await prisma.diagnosticCentre.create({ data });
    res.status(201).json(centre);
  }

  async addTestToCentre(req: Request, res: Response) {
    const centreId = req.params.id as string;
    
    const schema = z.object({
      testId: z.string().uuid(),
      pricePaise: z.number().int().positive()
    });

    const data = schema.parse(req.body);

    const centre = await prisma.diagnosticCentre.findUnique({ where: { id: centreId } });
    if (!centre) throw new NotFound('Centre not found');

    const test = await prisma.diagnosticTest.findUnique({ where: { id: data.testId } });
    if (!test) throw new NotFound('Test not found');

    const existing = await prisma.centreTest.findUnique({
      where: { centreId_testId: { centreId, testId: data.testId } }
    });

    if (existing) {
      if (existing.isActive && existing.pricePaise === data.pricePaise) {
        throw new Conflict('Test already offered at this centre with this price');
      }
      
      const updated = await prisma.centreTest.update({
        where: { id: existing.id },
        data: { pricePaise: data.pricePaise, isActive: true }
      });
      res.json(updated);
      return;
    }

    const centreTest = await prisma.centreTest.create({
      data: {
        centreId,
        testId: data.testId,
        pricePaise: data.pricePaise
      }
    });

    res.status(201).json(centreTest);
  }
}
