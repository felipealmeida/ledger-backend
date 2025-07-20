import { Module } from '@nestjs/common';
import { LedgerController } from './controllers/ledger.controller';
import { AppController } from './controllers/app.controller';
import { LedgerService } from './services/ledgerService';

@Module({
  imports: [],
  controllers: [AppController, LedgerController],
  providers: [LedgerService],
})
export class AppModule {}
