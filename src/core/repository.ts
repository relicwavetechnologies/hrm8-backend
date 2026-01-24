import { prisma } from '../utils/prisma';

export abstract class BaseRepository {
  protected prisma = prisma;
}
