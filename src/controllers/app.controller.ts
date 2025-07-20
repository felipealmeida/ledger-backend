import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiDocumentation() {
    return {
      service: 'Ledger API (NestJS)',
      version: '1.0.0',
      endpoints: {
        'GET /api/balance': 'Get all account balances (query: file, command)',
        'GET /api/balance/:account': 'Get balance for specific account (query: file)',
        'GET /api/validate/:file': 'Validate ledger file',
        'GET /api/health': 'Health check',
        'GET /': 'This documentation'
      },
      examples: {
        'All balances': '/api/balance',
        'Custom file': '/api/balance?file=personal.ledger',
        'Specific account': '/api/balance/Ativos',
        'Custom command': '/api/balance?command=bal%20Receitas',
        'Validate file': '/api/validate/main.ledger'
      }
    };
  }
}
