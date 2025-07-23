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
        const nodeMap = new Map<string, LedgerAccountNode>();
        
        // First, create all nodes
        for (const account of flatAccounts) {
            const node: LedgerAccountNode = {
                account: account.account,
                fullPath: account.fullPath,
                amount: account.amount,
                formattedAmount: account.formattedAmount,
                children: [],
                hasChildren: false
            };
            nodeMap.set(account.fullPath, node);
        }
        
        // Then, build the tree structure
        for (const account of flatAccounts) {
            const node = nodeMap.get(account.fullPath)!;
            const pathParts = account.fullPath.split(':');
            
            if (pathParts.length === 1) {
                // Root level account
                tree.push(node);
            } else {
                // Find parent path
                const parentPath = pathParts.slice(0, -1).join(':');
                const parentNode = nodeMap.get(parentPath);
                
                if (parentNode) {
                    parentNode.children.push(node);
                    parentNode.hasChildren = true;
                } else {
                    // If parent doesn't exist in the data, add as root
                    tree.push(node);
                }
            }
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
                const [, amountStr, fullAccountPath] = match;

                // Find where the account name starts
                const fullAccountPathTrimmed = fullAccountPath.trim();

                // Parse amount
                const numericAmount = parseFloat(
                    amountStr.replace('BRL', '').replace(/,/g, '').trim()
                );

                // Extract just the account name (last part after the last colon)
                const accountParts = fullAccountPathTrimmed.split(':');
                const accountName = accountParts[accountParts.length - 1];

                this.logger.log(`Full path: "${fullAccountPathTrimmed}", account name: "${accountName}"`);

                accounts.push({
                    account: accountName,
                    fullPath: fullAccountPathTrimmed,
                    amount: numericAmount,
                    formattedAmount: amountStr.trim()
                });
            }
        }

        const accountTree = this.buildAccountTree(accounts);
        
        return {
            accounts: accountTree,
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
        let cmd = `ledger --flat -f /app/ledger-data/${ledgerFile}`;
  
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
