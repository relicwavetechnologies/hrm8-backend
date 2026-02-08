/**
 * Base service class.
 * Extend this class for shared service utilities if needed.
 */
import { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';

export abstract class BaseService {
    protected prisma: PrismaClient = prisma;
}


