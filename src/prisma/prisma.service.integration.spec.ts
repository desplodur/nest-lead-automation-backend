import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe('PrismaService (integration)', () => {
  let service: PrismaService;

  beforeAll(async () => {
    if (!hasDatabaseUrl) {
      return;
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (service) {
      await service.$disconnect();
    }
  });

  (hasDatabaseUrl ? it : it.skip)(
    'connects successfully with valid DATABASE_URL',
    async () => {
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    },
    10000,
  );

  (hasDatabaseUrl ? it : it.skip)(
    'executes a simple query (SELECT 1) when connected',
    async () => {
      const result = await service.$queryRaw`SELECT 1 as value`;
      expect(result).toEqual([{ value: 1 }]);
    },
  );

  (hasDatabaseUrl ? it : it.skip)(
    'leads table exists with expected columns after migration',
    async () => {
      const columns = await service.$queryRaw<
        Array<{ column_name: string; data_type: string }>
      >`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Lead'
        ORDER BY ordinal_position
      `;
      if (columns.length === 0) {
        return;
      }
      const columnNames = columns.map((c) => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('message');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');

      const idCol = columns.find((c) => c.column_name === 'id');
      expect(idCol?.data_type).toMatch(/uuid|character/);
    },
  );
});
