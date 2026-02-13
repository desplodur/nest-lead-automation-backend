import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, LeadsModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
