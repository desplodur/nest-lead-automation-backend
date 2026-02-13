import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { LeadResponseDto } from './../src/leads/dto/lead-response.dto';
import { LeadListResponseDto } from './../src/leads/dto/lead-list-response.dto';
import { PrismaService } from './../src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

/** Validation error response from NestJS ValidationPipe */
interface ValidationErrorBody {
  message: string | string[];
  error: string;
  statusCode: number;
}

/** In-memory store for e2e mock (cleared before each test). */
let e2eLeadStore: Array<{
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}> = [];

/** PrismaService mock so e2e can run without a real database. */
const mockPrismaService = {
  onModuleInit: () => Promise.resolve(),
  onModuleDestroy: () => Promise.resolve(),
  lead: {
    create: ({
      data,
    }: {
      data: { name: string; email: string; message: string };
    }) => {
      const id = uuidv4();
      const now = new Date();
      const lead = {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      e2eLeadStore.push(lead);
      return Promise.resolve(lead);
    },
    findMany: () => {
      const sorted = [...e2eLeadStore].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      return Promise.resolve(sorted);
    },
  },
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    e2eLeadStore = [];
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('AppController', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('HealthController GET /health', () => {
    it('returns 200 with status ok and timestamp', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const body = res.body as { status: string; timestamp: string };
          expect(body.status).toBe('ok');
          expect(body.timestamp).toBeDefined();
          expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
        });
    });
  });

  describe('LeadsController POST /leads', () => {
    const validBody = {
      name: 'Max Müller GmbH',
      email: 'max@mueller-gmbh.de',
      message: 'Wir suchen eine CRM-Lösung. Budget ca. 15.000€, Start Q2.',
    };

    it('returns 201 and response with leadId and receivedAt for valid body', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .send(validBody)
        .expect(201)
        .expect((res) => {
          const body = res.body as LeadResponseDto;
          expect(body.success).toBe(true);
          expect(body.message).toBe('Lead received successfully');
          expect(body.data).toBeDefined();
          expect(body.data.leadId).toBeDefined();
          expect(body.data.receivedAt).toBeDefined();
        });
    });

    it('returns 400 when name is missing', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .send({ email: validBody.email, message: validBody.message })
        .expect(400)
        .expect((res) => {
          const body = res.body as ValidationErrorBody;
          expect(body.message).toBeDefined();
          expect(Array.isArray(body.message)).toBe(true);
        });
    });

    it('returns 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .send({ ...validBody, email: 'notanemail' })
        .expect(400)
        .expect((res) => {
          const body = res.body as ValidationErrorBody;
          expect(body.message).toContain('Invalid email format');
        });
    });

    it('returns 400 when message is too short', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .send({ ...validBody, message: 'short' })
        .expect(400)
        .expect((res) => {
          const body = res.body as ValidationErrorBody;
          expect(body.message).toBeDefined();
        });
    });

    it('returns 400 when extra properties are sent (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/leads')
        .send({ ...validBody, extraField: 'not-allowed' })
        .expect(400);
    });
  });

  describe('LeadsController GET /leads', () => {
    it('returns 200 with empty array and count 0 when no leads', () => {
      return request(app.getHttpServer())
        .get('/leads')
        .expect(200)
        .expect((res) => {
          const body = res.body as LeadListResponseDto;
          expect(body.success).toBe(true);
          expect(body.data).toEqual([]);
          expect(body.count).toBe(0);
        });
    });

    it('returns 200 with leads ordered by newest first after POST', async () => {
      const validBody = {
        name: 'Test Co',
        email: 'test@test.de',
        message: 'Test message for GET',
      };
      const postRes = await request(app.getHttpServer())
        .post('/leads')
        .send(validBody)
        .expect(201);
      const leadId = (postRes.body as LeadResponseDto).data.leadId;

      const getRes = await request(app.getHttpServer())
        .get('/leads')
        .expect(200);
      const list = getRes.body as LeadListResponseDto;
      expect(list.success).toBe(true);
      expect(list.count).toBe(1);
      expect(list.data[0].id).toBe(leadId);
      expect(list.data[0].name).toBe(validBody.name);
      expect(list.data[0].email).toBe(validBody.email);
      expect(list.data[0].message).toBe(validBody.message);
      expect(list.data[0].createdAt).toBeDefined();
      expect(list.data[0].updatedAt).toBeDefined();
    });
  });
});
