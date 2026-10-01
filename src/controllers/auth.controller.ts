import { Request, Response } from 'express';
import { AuthService, signupSchema, loginSchema } from '../services/auth.service';
import { ValidationError, Unauthorized } from '../errors/AppError';

export class AuthController {
  constructor(private authService: AuthService) {}

  signup = async (req: Request, res: Response) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input data', parsed.error.format());
    }

    const result = await this.authService.signup(parsed.data);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input data', parsed.error.format());
    }

    const result = await this.authService.login(parsed.data);
    res.status(200).json(result);
  };

  me = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new Unauthorized('Not authenticated');
    }
    const user = await this.authService.getMe(req.user.userId);
    res.status(200).json({ user });
  };
}
