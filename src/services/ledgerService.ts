import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LedgerAccount, LedgerAccountNode, LedgerBalanceResponse, LedgerError } from '../types';

const execAsync = promisify(exec);

@Injectable()
export class LedgerService {
    private readonly logger = new Logger(LedgerService.name);

    /**
     * Build hierarchical tree from flat account list
     */
    private buildAccountTree(flatAccounts: LedgerAccount[]): LedgerAccountNode[] {
        const tree: LedgerAccountNode[] = [];
        const stack: LedgerAccountNode[] = [];

        for (const account of flatAccounts) {
            const node: LedgerAccountNode = {
                account: account.account,
                amount: account.amount,
                formattedAmount: account.formattedAmount,
                children: [],
                hasChildren: false
            };

            // Find the correct parent based on indentation level
            while (stack.length > account.indentLevel) {
                stack.pop();
            }

            if (stack.length === 0) {
                // Top-level account
                tree.push(node);
            } else {
                // Child account - add to parent's children
                const parent = stack[stack.length - 1];
                parent.children.push(node);
                parent.hasChildren = true;
            }

            stack.push(node);
        }

        return tree;
    }

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
                
                // Find where the amount starts and ends
                const amountStartPosition = line.indexOf(amountStr);
                const amountEndPosition = amountStartPosition + amountStr.length;
    
                // Find where the account name starts
                const accountNameTrimmed = accountName.trim();
                const accountStartPosition = line.indexOf(accountNameTrimmed);
    
                // Calculate spaces between amount end and account start
                const spacesBetween = accountStartPosition - amountEndPosition;
    
                // Parse amount
                const numericAmount = parseFloat(
                    amountStr.replace('BRL', '').replace(/,/g, '').trim()
                );
                
                // Determine indentation level based on account start position
                const indentLevel = (spacesBetween - 2) / 2;
                this.logger.log(`Account: "${accountNameTrimmed}", position: ${accountStartPosition}, level: ${indentLevel}`);
                
                accounts.push({
                    account: accountNameTrimmed,
                    amount: numericAmount,
                    formattedAmount: amountStr.trim(),
                    indentLevel,
                    isSubAccount: indentLevel > 0
                });
            }
        }
        
        const accountTree = this.buildAccountTree(accounts);
        
        return {
            accounts: accountTree, // Return tree instead of flat list
            currency: 'BRL',
            timestamp: new Date().toISOString(),
            total: 0
        };
    }

    private buildLedgerCommand(
        ledgerFile: string = 'main.ledger',
        command: string = 'bal',
        period?: string
    ): string {
        let cmd = `ledger -f /app/ledger-data/${ledgerFile}`;
  
        // Add period filter if provided
        if (period) {
            cmd += ` --period ${period}`;
        }
  
        cmd += ` ${command}`;
        return cmd;
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
            const cmd = this.buildLedgerCommand(ledgerFile, command, period);
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

    async getAccountTransactions(account: string, file?: string, period?: string): Promise<any> {
        try {
            //await this.executeGitPull();
            
            const cmd = this.buildLedgerCommand(file, 'reg ' + account, period);
            this.logger.log(`Executing command: ${cmd}`);
            
            const { stdout, stderr } = await execAsync(cmd, { 
                cwd: process.cwd(),
                timeout: 30000
            });
            
            if (stderr) {
                this.logger.warn(`Ledger stderr: ${stderr}`);
            }
            
            return {
                transactions: this.parseTransactions(stdout),
                account: account,
                period: period,
                timestamp: new Date().toISOString()
            };
            
        } catch (error: unknown) {
            // Same error handling as other methods
            throw error;
        }
    }

    // ADD this new method:
    private parseTransactions(output: string): any[] {
        const lines = output.split('\n').filter(line => line.trim() !== '');
        const transactions = [];
        
        for (const line of lines) {
            const match = line.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+?)\s+(BRL\s*[+-]?[\d,]+\.\d{2})\s+(.+)$/);
            if (match) {
                const [, date, description, amount, account] = match;
                transactions.push({
                    date,
                    description: description.trim(),
                    amount: parseFloat(amount.replace('BRL', '').replace(/,/g, '').trim()),
                    formattedAmount: amount.trim(),
                    account: account.trim()
                });
            }
        }
        
        return transactions;
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
