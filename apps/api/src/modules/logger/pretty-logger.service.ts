import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class PrettyLogger extends ConsoleLogger {
  private static readonly IGNORED_CONTEXTS = new Set([
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'NestFactory',
    'NestApplication',
    'RouterExplorer',
  ]);

  private formatTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `\x1b[90m${hours}:${minutes}:${seconds}\x1b[0m`;
  }

  private getLogLevelColor(level: LogLevel): string {
    switch (level) {
      case 'log': return '\x1b[32m[INFO]\x1b[0m';       // Green
      case 'error': return '\x1b[31m\x1b[1m[ERROR]\x1b[0m'; // Bold Red
      case 'warn': return '\x1b[33m\x1b[1m[WARN]\x1b[0m';  // Bold Yellow
      case 'debug': return '\x1b[35m[DEBUG]\x1b[0m';     // Magenta
      case 'verbose': return '\x1b[36m[VERB]\x1b[0m';   // Cyan
      default: return '\x1b[37m[INFO]\x1b[0m';
    }
  }

  private print(level: LogLevel, message: any, context?: string, stack?: string) {
    const ctx = context || this.context || 'System';
    
    // Silence heavy NestJS framework startup/mapping logs for a cleaner console
    if (PrettyLogger.IGNORED_CONTEXTS.has(ctx) && level === 'log') {
      return;
    }

    const time = this.formatTimestamp();
    const coloredLevel = this.getLogLevelColor(level);
    const contextTag = ctx ? `\x1b[36m[${ctx}]\x1b[0m` : ''; // Cyan colored context tag
    
    let formattedMsg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    
    // Dynamically inject beautiful semantic status emojis/icons to enhance readability
    if (typeof formattedMsg === 'string') {
      if (
        formattedMsg.includes('Successfully') || 
        formattedMsg.includes('successfully') || 
        formattedMsg.includes('passed') || 
        formattedMsg.includes('running on')
      ) {
        formattedMsg = `\x1b[32m✔\x1b[0m ${formattedMsg}`;
      } else if (
        formattedMsg.includes('FAILED') || 
        formattedMsg.includes('Error') || 
        formattedMsg.includes('exhausted') || 
        formattedMsg.includes('Sync failed')
      ) {
        formattedMsg = `\x1b[31m✖\x1b[0m ${formattedMsg}`;
      } else if (
        formattedMsg.includes('WARN') || 
        formattedMsg.includes('warning') || 
        formattedMsg.includes('dlq_alert') || 
        formattedMsg.includes('CRITICAL') ||
        formattedMsg.includes('Manual intervention')
      ) {
        formattedMsg = `\x1b[33m⚠\x1b[0m ${formattedMsg}`;
      } else if (
        formattedMsg.includes('initialised') || 
        formattedMsg.includes('Initializing') || 
        formattedMsg.includes('Queue') || 
        formattedMsg.includes('Mapped')
      ) {
        formattedMsg = `\x1b[34m⚡\x1b[0m ${formattedMsg}`;
      }
    }

    console.log(`${time} ${coloredLevel} ${contextTag} ${formattedMsg}`);
    
    if (stack && level === 'error') {
      console.log(`\x1b[90m${stack}\x1b[0m`);
    }
  }

  override log(message: any, context?: string) {
    this.print('log', message, context);
  }

  override error(message: any, stack?: string, context?: string) {
    this.print('error', message, context, stack);
  }

  override warn(message: any, context?: string) {
    this.print('warn', message, context);
  }

  override debug(message: any, context?: string) {
    this.print('debug', message, context);
  }

  override verbose(message: any, context?: string) {
    this.print('verbose', message, context);
  }
}
