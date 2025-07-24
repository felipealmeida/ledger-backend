import { ApiProperty } from '@nestjs/swagger';

export class LedgerAccount {
  @ApiProperty({ description: 'Account name' })
  account: string;

  @ApiProperty({ description: 'Numeric amount' })
  amount: number;

  @ApiProperty({ description: 'Formatted amount with currency' })
  formattedAmount: string;

  @ApiProperty({ description: 'Numeric cleared amount' })
  clearedAmount: number;

  @ApiProperty({ description: 'Formatted cleared amount with currency' })
  formattedClearedAmount: string;

  @ApiProperty({ description: 'Full path to account' })
  fullPath: string;

  @ApiProperty({ description: 'Last cleared date' })
  lastClearedDate: string;
}

export class LedgerAccountNode {
  @ApiProperty({ description: 'Account name' })
  account: string;

  @ApiProperty({ description: 'Numeric amount' })
  amount: number;

  @ApiProperty({ description: 'Formatted amount with currency' })
  formattedAmount: string;

  @ApiProperty({ description: 'Numeric cleared amount' })
  clearedAmount: number;

  @ApiProperty({ description: 'Formatted cleared amount with currency' })
  formattedClearedAmount: string;

  @ApiProperty({ description: 'Child accounts', type: [LedgerAccountNode] })
  children: LedgerAccountNode[];

  @ApiProperty({ description: 'Whether this account has children' })
  hasChildren: boolean;

  @ApiProperty({ description: 'Full path to account' })
  fullPath: string;

  @ApiProperty({ description: 'Last cleared date' })
  lastClearedDate: string;
}

export class LedgerTransactionNode {
  @ApiProperty({ description: 'Numeric amount' })
  amount: number;

  @ApiProperty({ description: 'Formatted amount with currency' })
  formattedAmount: string;

  @ApiProperty({ description: 'Numeric amount' })
  runningBalance: number;

  @ApiProperty({ description: 'Formatted amount with currency' })
  formattedRunningBalance: string;

  @ApiProperty({ description: 'Description of the transaction' })
  description: string;

  @ApiProperty({ description: 'Date of the transaction' })
  date: string;
}

export class LedgerBalanceResponse {
  @ApiProperty({ type: [LedgerAccountNode], description: 'Hierarchical account tree' })
  accounts: LedgerAccountNode[];

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

export class LedgerTransactionResponse {
  @ApiProperty({ type: [LedgerAccountNode], description: 'Hierarchical account tree' })
  transactions: LedgerTransactionNode[];

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp: string;

  @ApiProperty({ description: 'Period filter used in the query', required: false })
  period?: string;

  @ApiProperty({ description: 'Account name' })
  account: string;
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
