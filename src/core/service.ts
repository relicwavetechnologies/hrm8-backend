import { prisma } from '../utils/prisma';

/**
 * Base service class.
 * Extend this class for shared service utilities if needed.
 */
export abstract class BaseService {
  protected prisma = prisma;
}


