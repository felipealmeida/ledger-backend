import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LedgerAccount, LedgerAccountNode, LedgerTransactionNode, LedgerTransactionResponse, LedgerBalanceResponse, LedgerError } from '../types';

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
        command: string = 'bal',
        period?: string
    ): string {
        let cmd = `ledger --flat -f /app/ledger-data/main.ledger`;
  
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
        command: string = 'bal',
        period?: string
    ): Promise<LedgerBalanceResponse> {
        try {
            const cmd = this.buildLedgerCommand(command, period);
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

    async getAccountTransactions(account: string, period?: string): Promise<LedgerTransactionResponse> {
        try {
            //await this.executeGitPull();
            
            const cmd = this.buildLedgerCommand('reg "' + account + '" --sort date --date-format "%Y/%m/%d"', period);
            this.logger.log(`Executing command: ${cmd}`);
            
            const { stdout, stderr } = await execAsync(cmd, { 
                cwd: process.cwd(),
                timeout: 30000
            });
            
            if (stderr) {
                this.logger.warn(`Ledger stderr: ${stderr}`);
            }

            this.logger.log(`Output:\n${stdout}`);
            
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

    private parseTransactions(output: string): LedgerTransactionNode[] {
        const lines = output.split('\n').filter(line => line.trim() !== '');
        const transactions = [];
        
        for (const line of lines) {
            this.logger.log(`line ${line}`);
            const match = line.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+?)\s+(BRL\s*[+-]?[\d,]+\.\d{2})\s+(.+)$/);
            if (match) {
                this.logger.log(`a match for ${line}`);
                const [, date, description, amount, runningBalance] = match;
                transactions.push({
                    date,
                    description: description.trim(),
                    amount: parseFloat(amount.replace('BRL', '').replace(/,/g, '').trim()),
                    formattedAmount: amount.trim(),
                    runningBalance: parseFloat(runningBalance.replace('BRL', '').replace(/,/g, '').trim()),
                    formattedRunningBalance: runningBalance.trim()
                });
            }
        }
        
        return transactions;
    }

    /**
     * Get balance for all accounts
     */
    async getBalance(command?: string, period?: string): Promise<LedgerBalanceResponse> {
        return this.executeLedgerCommand(command, period);
    }

    /**
     * Get balance for a specific account
     */
    async getAccountBalance(account: string, period?: string): Promise<LedgerBalanceResponse> {
        const command = `bal ${account}`;
        return this.executeLedgerCommand(command, period);
    }
}
