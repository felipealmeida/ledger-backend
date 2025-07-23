import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LedgerAccount, LedgerBalanceResponse, LedgerError } from '../types';

const execAsync = promisify(exec);

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  /**
   * Parse ledger balance output into structured data
   */
  private parseLedgerBalance(output: string): LedgerBalanceResponse {
    const lines = output.split('\n').filter(line => line.trim() !== '');
    const accounts: LedgerAccount[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip the separator line and total
      if (line.includes('----') || line.trim() === '0') {
        continue;
      }
      
      // Parse account line using regex
      const match = line.match(/^\s*(BRL\s*[+-]?[\d,]+\.\d{2})\s+(.+)$/);
      if (match) {
        const [, amountStr, accountName] = match;
        
        // Parse amount - remove BRL prefix and commas, then convert to number
        const numericAmount = parseFloat(
          amountStr.replace('BRL', '').replace(/,/g, '').trim()
        );
        
        // Calculate indentation level (each 2 spaces = 1 level)
        const leadingSpaces = line.length - line.trimStart().length;
        const indentLevel = Math.floor(leadingSpaces / 2);
        
        accounts.push({
          account: accountName.trim(),
          amount: numericAmount,
          formattedAmount: amountStr.trim(),
          indentLevel,
          isSubAccount: indentLevel > 0
        });
      }
    }
    
    return {
      accounts,
      currency: 'BRL',
      timestamp: new Date().toISOString(),
      total: 0 // As shown in the ledger output
    };
  }

  /**
   * Execute ledger command and return parsed results
   */
  async executeLedgerCommand(
    ledgerFile: string = 'main.ledger', 
    command: string = 'bal',
    period?: string
  ): Promise<LedgerBalanceResponse> {
    try {
      let cmd = `ledger -f /app/ledger/personal/${ledgerFile}`;
      if (period) {
        cmd += ` --period ${period}`;
      }
      cmd += ` ${command}`;        
      this.logger.log(`Executing command: ${cmd}`);
      
      const { stdout, stderr } = await execAsync(cmd, { 
        cwd: process.cwd(),
        timeout: 30000 // 30 second timeout
      });
      
      if (stderr) {
        this.logger.warn(`Ledger stderr: ${stderr}`);
      }
      
      const parsedData = this.parseLedgerBalance(stdout);
      this.logger.log(`Successfully parsed ${parsedData.accounts.length} accounts`);
      return parsedData;
      
    } catch (error: unknown) {
      const execError = error as { 
        message: string; 
        stderr?: string; 
        code?: number;
        signal?: string;
      };
      
      this.logger.error(`Command execution failed: ${execError.message}`);
      
      const ledgerError: LedgerError = {
        error: 'Command execution failed',
        message: execError.message,
        stderr: execError.stderr
      };
      
      throw ledgerError;
    }
  }

  /**
   * Get balance for all accounts
   */
  async getBalance(file?: string, command?: string, period?: string): Promise<LedgerBalanceResponse> {
    return this.executeLedgerCommand(file, command, period);
  }

  /**
   * Get balance for a specific account
   */
  async getAccountBalance(account: string, file?: string, period?: string): Promise<LedgerBalanceResponse> {
    const command = `bal ${account}`;
    return this.executeLedgerCommand(file, command, period);
  }

  /**
   * Validate ledger file exists and is readable
   */
  async validateLedgerFile(file: string): Promise<boolean> {
    try {
      this.logger.log(`Validating ledger file: ${file}`);
      const { stdout } = await execAsync(`ledger -f ${file} --version`, {
        timeout: 5000
      });
      const isValid = stdout.includes('Ledger');
      this.logger.log(`File validation result for ${file}: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error(`File validation failed for ${file}: ${error}`);
      return false;
    }
  }
}
