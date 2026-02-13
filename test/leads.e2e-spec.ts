import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { LeadListResponseDto } from './../src/leads/dto/lead-list-response.dto';
import { LeadResponseDto } from './../src/leads/dto/lead-response.dto';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe('Leads (e2e with real database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    if (!hasDatabaseUrl) return;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    if (prisma) await prisma.lead.deleteMany();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  (hasDatabaseUrl ? it : it.skip)(
    'POST lead then GET leads returns the created lead',
    async () => {
      const body = {
        name: 'Persistence Test Co',
        email: 'persist@test.de',
        message: 'Message for persistence test',
      };
      const postRes = await request(app.getHttpServer())
        .post('/leads')
        .send(body)
        .expect(201);

      const created = postRes.body as LeadResponseDto;
      expect(created.success).toBe(true);
      expect(created.data.leadId).toBeDefined();
      expect(created.data.receivedAt).toBeDefined();

      const getRes = await request(app.getHttpServer())
        .get('/leads')
        .expect(200);
      const list = getRes.body as LeadListResponseDto;
      expect(list.success).toBe(true);
      expect(list.count).toBe(1);
      expect(list.data[0].id).toBe(created.data.leadId);
      expect(list.data[0].name).toBe(body.name);
      expect(list.data[0].email).toBe(body.email);
      expect(list.data[0].message).toBe(body.message);
    },
  );

  (hasDatabaseUrl ? it : it.skip)(
    'POST 3 leads then GET leads returns all 3 ordered newest first',
    async () => {
      // 3 POSTs each trigger AI calls; allow up to 60s
      const leads = [
        {
          name: 'First',
          email: 'first@test.de',
          message: 'First message here.',
        },
        {
          name: 'Second',
          email: 'second@test.de',
          message: 'Second message here.',
        },
        {
          name: 'Third',
          email: 'third@test.de',
          message: 'Third message here.',
        },
      ];
      const ids: string[] = [];
      for (const lead of leads) {
        const res = await request(app.getHttpServer())
          .post('/leads')
          .send(lead)
          .expect(201);
        ids.push((res.body as LeadResponseDto).data.leadId);
      }

      const getRes = await request(app.getHttpServer())
        .get('/leads')
        .expect(200);
      const list = getRes.body as LeadListResponseDto;
      expect(list.count).toBe(3);
      expect(list.data.map((l) => l.id).sort()).toEqual([...ids].sort());
      const names = list.data.map((l) => l.name);
      expect(names).toContain('First');
      expect(names).toContain('Second');
      expect(names).toContain('Third');
    },
    60_000,
  );
});
