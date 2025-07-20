import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  HttpException, 
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { LedgerService } from '../services/ledgerService';
import { 
  LedgerBalanceResponse, 
  ValidationResponse
} from '../types';

@Controller('api')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('balance')
  async getBalance(
    @Query('file') file: string = 'main.ledger',
    @Query('command') command: string = 'bal'
  ): Promise<LedgerBalanceResponse> {
    try {
      return await this.ledgerService.getBalance(file, command);
    } catch (error) {
      throw new HttpException(
        {
          error: 'Internal server error',
          details: error
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('balance/:account')
  async getAccountBalance(
    @Param('account') account: string,
    @Query('file') file: string = 'main.ledger'
  ): Promise<LedgerBalanceResponse> {
    try {
      if (!account || account.trim() === '') {
        throw new BadRequestException('Account parameter is required');
      }
      
      return await this.ledgerService.getAccountBalance(account, file);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new HttpException(
        {
          error: 'Internal server error',
          details: error
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('validate/:file')
  async validateFile(@Param('file') file: string): Promise<ValidationResponse> {
    try {
      const isValid = await this.ledgerService.validateLedgerFile(file);
      
      return {
        file,
        valid: isValid,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        {
          error: 'Validation failed',
          details: error
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ledger-api'
    };
  }
}
