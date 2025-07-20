import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BalanceQueryDto {
  @ApiProperty({ 
    description: 'Ledger file name', 
    required: false, 
    default: 'main.ledger' 
  })
  @IsOptional()
  @IsString()
  file?: string = 'main.ledger';

  @ApiProperty({ 
    description: 'Ledger command to execute', 
    required: false, 
    default: 'bal' 
  })
  @IsOptional()
  @IsString()
  command?: string = 'bal';
}

export class AccountBalanceParamsDto {
  @ApiProperty({ description: 'Account name to query' })
  @IsString()
  account: string;
}

export class FileValidationParamsDto {
  @ApiProperty({ description: 'Ledger file name to validate' })
  @IsString()
  file: string;
}
