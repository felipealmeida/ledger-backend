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
    LedgerTransactionResponse, 
    LedgerSubTotalsResponse, 
    ValidationResponse
} from '../types';
import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiParam, 
    ApiQuery 
} from '@nestjs/swagger';

@ApiTags('ledger')
@Controller('api')
export class LedgerController {
    constructor(private readonly ledgerService: LedgerService) {}

    @ApiQuery({ name: 'period', required: false, description: 'Period filter (e.g., 2025/07)', example: '2025/07' })
    @Get('balance')
    async getBalance(
        @Query('command') command: string = 'bal',
        @Query('period') period?: string      
    ): Promise<LedgerBalanceResponse> {
        try {
            return await this.ledgerService.getBalance('cleared', period);
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

    @ApiQuery({ name: 'period', required: false, description: 'Period filter (e.g., 2025/07)', example: '2025/07' })
    @Get('balance/:account')
    async getAccountBalance(
        @Param('account') account: string,
        @Query('period') period?: string
    ): Promise<LedgerBalanceResponse> {
        try {
            if (!account || account.trim() === '') {
                throw new BadRequestException('Account parameter is required');
            }
            
            return await this.ledgerService.getAccountBalance(account, period);
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

    @ApiQuery({ name: 'period', required: false, description: 'Period filter (e.g., 2025/07)', example: '2025/07' })
    @Get('cash-flow')
    async getCashFlow(
        @Query('period') period?: string      
    ): Promise<LedgerSubTotalsResponse> {
        try {
            return await this.ledgerService.getCashFlow(period);
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

    @ApiQuery({ name: 'period', required: false, description: 'Period filter (e.g., 2025/07)', example: '2025/07' })
    @Get('cash-flow/:account')
    async getAccountCashFlow(
        @Param('account') account: string,
        @Query('period') period?: string
    ): Promise<LedgerSubTotalsResponse> {
        try {
            if (!account || account.trim() === '') {
                throw new BadRequestException('Account parameter is required');
            }
            
            return await this.ledgerService.getAccountCashFlow(account, period);
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

    @Get('transactions/:account')
    @ApiOperation({ summary: 'Get transactions for specific account' })
    @ApiParam({ name: 'account', description: 'Account name' })
    @ApiQuery({ name: 'period', required: false, description: 'Period filter' })
    async getAccountTransactions(
        @Param('account') account: string,
        @Query('period') period?: string
    ): Promise<LedgerTransactionResponse> {
        try {
            return await this.ledgerService.getAccountTransactions(account, period);
        } catch (error) {
            throw new HttpException(
                { error: 'Internal server error', details: error },
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
