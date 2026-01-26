/**
 * Professional Logging & Metrics Utility
 *
 * Features:
 * - Namespace-based logging (e.g., 'stripe', 'auth', 'wallet')
 * - Multiple log levels (debug, info, warn, error)
 * - Performance metrics tracking
 * - Environment-aware (verbose in dev, minimal in prod)
 * - Easy to enable/disable specific services
 *
 * Usage:
 *   const logger = Logger.create('stripe');
 *   logger.info('Payment processed', { amount: 100 });
 *   logger.error('Payment failed', error);
 *
 *   // Performance tracking
 *   const timer = logger.startTimer();
 *   await doWork();
 *   timer.end('Work completed');
 *
 * Environment Variables:
 *   LOG_LEVEL=debug|info|warn|error     # Minimum log level to show
 *   LOG_NAMESPACES=stripe,auth,wallet   # Only show these namespaces (comma-separated)
 *   LOG_DISABLED=true                   # Disable all logging
 *   LOG_METRICS=true                    # Enable performance metrics
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

interface LogConfig {
  level: LogLevel;
  namespaces: string[];
  disabled: boolean;
  useColors: boolean;
  enableMetrics: boolean;
}

interface Timer {
  end: (message?: string, meta?: any) => void;
}

class Logger {
  private static config: LogConfig = {
    level: LogLevel.INFO,
    namespaces: [],
    disabled: false,
    useColors: true,
    enableMetrics: false,
  };

  private namespace: string;

  private constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Create a logger instance for a specific namespace
   */
  static create(namespace: string): Logger {
    return new Logger(namespace);
  }

  /**
   * Initialize logging configuration from environment
   */
  static configure() {
    // Set log level
    const logLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (logLevel === 'debug') this.config.level = LogLevel.DEBUG;
    else if (logLevel === 'info') this.config.level = LogLevel.INFO;
    else if (logLevel === 'warn') this.config.level = LogLevel.WARN;
    else if (logLevel === 'error') this.config.level = LogLevel.ERROR;
    else if (logLevel === 'silent') this.config.level = LogLevel.SILENT;
    else {
      // Default: INFO in production, DEBUG in development
      this.config.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }

    // Set enabled namespaces (if specified)
    if (process.env.LOG_NAMESPACES) {
      this.config.namespaces = process.env.LOG_NAMESPACES.split(',').map(ns => ns.trim());
    }

    // Check if logging is disabled
    this.config.disabled = process.env.LOG_DISABLED === 'true';

    // Enable metrics
    this.config.enableMetrics = process.env.LOG_METRICS === 'true';

    // Disable colors in production or if NO_COLOR is set
    this.config.useColors = process.env.NODE_ENV !== 'production' && !process.env.NO_COLOR;
  }

  /**
   * Check if this logger should output based on config
   */
  private shouldLog(level: LogLevel): boolean {
    if (Logger.config.disabled) return false;
    if (level < Logger.config.level) return false;
    if (Logger.config.namespaces.length > 0 && !Logger.config.namespaces.includes(this.namespace)) {
      return false;
    }
    return true;
  }

  /**
   * Format the log message with colors and timestamp
   */
  private format(level: string, message: string, color?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.namespace}] [${level}]`;

    if (Logger.config.useColors && color) {
      return `${color}${prefix}\x1b[0m ${message}`;
    }
    return `${prefix} ${message}`;
  }

  /**
   * Format metadata for logging
   */
  private formatMeta(meta?: any): string {
    if (!meta) return '';

    if (typeof meta === 'string') return ` - ${meta}`;

    if (meta instanceof Error) {
      return `\n  Error: ${meta.message}\n  Stack: ${meta.stack}`;
    }

    try {
      const jsonStr = JSON.stringify(meta, null, 2);
      return `\n  ${jsonStr.split('\n').join('\n  ')}`;
    } catch {
      return ` - ${String(meta)}`;
    }
  }

  /**
   * Debug level logging (verbose)
   */
  debug(message: string, meta?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.format('DEBUG', message, '\x1b[36m'); // Cyan
    console.log(formatted + this.formatMeta(meta));
  }

  /**
   * Info level logging (general information)
   */
  info(message: string, meta?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.format('INFO', message, '\x1b[32m'); // Green
    console.log(formatted + this.formatMeta(meta));
  }

  /**
   * Warning level logging (potential issues)
   */
  warn(message: string, meta?: any) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.format('WARN', message, '\x1b[33m'); // Yellow
    console.warn(formatted + this.formatMeta(meta));
  }

  /**
   * Error level logging (errors and exceptions)
   */
  error(message: string, meta?: any) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.format('ERROR', message, '\x1b[31m'); // Red
    console.error(formatted + this.formatMeta(meta));
  }

  /**
   * Log HTTP request (special format)
   */
  http(method: string, path: string, statusCode?: number, duration?: number) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    let color = '\x1b[32m'; // Green for success
    if (statusCode && statusCode >= 400) color = '\x1b[31m'; // Red for errors
    else if (statusCode && statusCode >= 300) color = '\x1b[33m'; // Yellow for redirects

    const durationStr = duration ? ` (${duration}ms)` : '';
    const statusStr = statusCode ? ` ${statusCode}` : '';
    const message = `${method} ${path}${statusStr}${durationStr}`;

    const formatted = this.format('HTTP', message, color);
    console.log(formatted);
  }

  /**
   * Start a performance timer
   * Returns an object with end() method to log duration
   */
  startTimer(): Timer {
    const startTime = Date.now();
    const namespace = this.namespace;

    return {
      end: (message?: string, meta?: any) => {
        const duration = Date.now() - startTime;
        const msg = message || 'Operation completed';

        if (Logger.config.enableMetrics) {
          const metricMsg = `${msg} [${duration}ms]`;
          const formatted = this.format('METRIC', metricMsg, '\x1b[35m'); // Magenta
          console.log(formatted + this.formatMeta(meta));
        } else {
          this.debug(`${msg} [${duration}ms]`, meta);
        }
      },
    };
  }

  /**
   * Log a metric value
   */
  metric(name: string, value: number, unit: string = 'ms') {
    if (!Logger.config.enableMetrics) return;
    if (!this.shouldLog(LogLevel.INFO)) return;

    const message = `${name}: ${value}${unit}`;
    const formatted = this.format('METRIC', message, '\x1b[35m'); // Magenta
    console.log(formatted);
  }
}

// Initialize configuration on module load
Logger.configure();

// Export both class and default instance for backward compatibility
export { Logger };

// Legacy export (for existing code that uses `logger.info()`)
export const logger = {
  info: (message: string, meta?: unknown) => Logger.create('app').info(message, meta),
  warn: (message: string, meta?: unknown) => Logger.create('app').warn(message, meta),
  error: (message: string, meta?: unknown) => Logger.create('app').error(message, meta),
  debug: (message: string, meta?: unknown) => Logger.create('app').debug(message, meta),
};
