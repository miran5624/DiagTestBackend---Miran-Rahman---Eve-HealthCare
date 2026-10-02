import { Router } from 'express';
import { TestController } from '../controllers/test.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const testRoutes = Router();
const testController = new TestController();

testRoutes.get('/', asyncHandler(testController.getTests.bind(testController)));
