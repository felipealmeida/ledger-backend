import { ApiProperty } from '@nestjs/swagger';

export class LedgerAccount {
  @ApiProperty({ description: 'Account name' })
  account: string;

  @ApiProperty({ description: 'Numeric amount' })
  amount: number;

  @ApiProperty({ description: 'Formatted amount with currency' })
  formattedAmount: string;

  @ApiProperty({ description: 'Indentation level in the hierarchy' })
  indentLevel: number;

  @ApiProperty({ description: 'Whether this is a sub-account' })
  isSubAccount: boolean;
}

export class LedgerBalanceResponse {
  @ApiProperty({ type: [LedgerAccount], description: 'List of accounts with balances' })
  accounts: LedgerAccount[];

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp: string;

  @ApiProperty({ description: 'Total balance' })
  total: number;

  @ApiProperty({ description: 'Period filter used in the query', required: false })
  period?: string;

  @ApiProperty({ description: 'Executed ledger command', required: false })
  command?: string;
}

export class LedgerError {
  @ApiProperty({ description: 'Error type' })
  error: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Standard error output', required: false })
  stderr?: string;

  @ApiProperty({ description: 'Raw command output', required: false })
  rawOutput?: string;
}

export class ApiError {
  @ApiProperty({ description: 'Error message' })
  error: string;

  @ApiProperty({ description: 'Error details', required: false })
  details?: LedgerError | unknown;
}

export class HealthResponse {
  @ApiProperty({ description: 'Service status' })
  status: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Service name' })
  service: string;
}

export class ValidationResponse {
  @ApiProperty({ description: 'Ledger file name' })
  file: string;

  @ApiProperty({ description: 'Whether the file is valid' })
  valid: boolean;

  @ApiProperty({ description: 'Validation timestamp' })
  timestamp: string;
}

export class ApiDocumentation {
  @ApiProperty({ description: 'Service name' })
  service: string;

  @ApiProperty({ description: 'API version' })
  version: string;

  @ApiProperty({ description: 'Available endpoints' })
  endpoints: Record<string, string>;

  @ApiProperty({ description: 'Usage examples' })
  examples: Record<string, string>;
}
