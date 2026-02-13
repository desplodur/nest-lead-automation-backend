import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

const validDataSourceUrl =
  'postgresql://user:password@localhost:5432/test?schema=public';

describe('PrismaService', () => {
  let service: PrismaService;
  let connectMock: jest.Mock;
  let disconnectMock: jest.Mock;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    originalEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = validDataSourceUrl;

    connectMock = jest.fn();
    disconnectMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    service.$connect = connectMock;
    service.$disconnect = disconnectMock;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('connects to database successfully when $connect resolves', async () => {
      connectMock.mockResolvedValue(undefined);

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(connectMock).toHaveBeenCalledTimes(1);
    });

    it('throws when $connect rejects with PrismaClientInitializationError', async () => {
      const error = new Error('Invalid connection string');
      error.name = 'PrismaClientInitializationError';
      connectMock.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Invalid connection string',
      );
      expect(connectMock).toHaveBeenCalledTimes(1);
    });

    it('throws when connection times out', async () => {
      const timeoutError = new Error('Connection timeout');
      connectMock.mockRejectedValue(timeoutError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Connection timeout',
      );
      expect(connectMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects successfully when $disconnect is called', async () => {
      disconnectMock.mockResolvedValue(undefined);

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(disconnectMock).toHaveBeenCalledTimes(1);
    });

    it('resolves without error when already disconnected', async () => {
      disconnectMock.mockResolvedValue(undefined);

      await service.onModuleDestroy();
      await service.onModuleDestroy();

      expect(disconnectMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('constructor', () => {
    it('throws when DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL;
      await expect(
        Test.createTestingModule({ providers: [PrismaService] }).compile(),
      ).rejects.toThrow('DATABASE_URL environment variable is required');
    });

    it('throws when DATABASE_URL is empty string', async () => {
      process.env.DATABASE_URL = '   ';
      await expect(
        Test.createTestingModule({ providers: [PrismaService] }).compile(),
      ).rejects.toThrow('DATABASE_URL environment variable is required');
    });
  });
});
