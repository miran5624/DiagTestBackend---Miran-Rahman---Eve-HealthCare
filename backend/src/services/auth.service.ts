import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserRepository } from '../repositories/user.repository';
import { Conflict, Unauthorized, NotFound } from '../errors/AppError';
import { env } from '../config/env';

export const signupSchema = z.object({
  email: z.string().email().transform(e => e.toLowerCase()),
  password: z.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email().transform(e => e.toLowerCase()),
  password: z.string(),
});

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async signup(data: z.infer<typeof signupSchema>) {
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new Conflict('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.userRepo.createUser({
      email: data.email,
      passwordHash,
      name: data.name,
    });

    const token = this.generateToken(user.id);
    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      token
    };
  }

  async login(data: z.infer<typeof loginSchema>) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new Unauthorized('Invalid credentials');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new Unauthorized('Invalid credentials');
    }

    const token = this.generateToken(user.id);
    return { token };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFound('User not found');
    }
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  }

  private generateToken(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  }
}
