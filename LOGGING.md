# Logging System Documentation

## Overview

The backend uses a professional, namespace-based logging system with the following features:

- **Namespace-based**: Each module has its own logger (e.g., `stripe`, `auth`, `wallet`)
- **Multiple log levels**: DEBUG, INFO, WARN, ERROR
- **Performance metrics**: Track execution time and performance
- **Environment-aware**: Verbose in development, minimal in production
- **Selective logging**: Enable/disable specific services via environment variables
- **Color-coded output**: Easy to scan logs visually (disabled in production)

## Quick Start

### Basic Usage

```typescript
import { Logger } from '../utils/logger';

const logger = Logger.create('my-service');

logger.debug('Detailed debug information', { userId: '123' });
logger.info('General information', { status: 'success' });
logger.warn('Warning message', { reason: 'something unusual' });
logger.error('Error occurred', error);
```

### In Controllers

Controllers automatically get a logger instance via `BaseController`:

```typescript
export class MyController extends BaseController {
  constructor() {
    super('my-namespace'); // Set your namespace
  }

  myMethod = async (req: Request, res: Response) => {
    this.logger.info('Processing request', { userId: req.user?.id });

    try {
      // Your logic
      this.logger.debug('Step completed', { step: 1 });
    } catch (error) {
      // Errors are automatically logged by sendError()
      return this.sendError(res, error);
    }
  };
}
```

### Performance Tracking

Track execution time of operations:

```typescript
const logger = Logger.create('database');

const timer = logger.startTimer();
await performDatabaseQuery();
timer.end('Database query completed'); // Logs: "Database query completed [123ms]"
```

Or log specific metrics:

```typescript
logger.metric('query-time', 123, 'ms');
logger.metric('memory-usage', 500, 'MB');
```

## Environment Configuration

Control logging behavior via environment variables:

### LOG_LEVEL

Set minimum log level to display:

```bash
LOG_LEVEL=debug   # Show all logs (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL=info    # Show INFO, WARN, ERROR (default in production)
LOG_LEVEL=warn    # Show only WARN and ERROR
LOG_LEVEL=error   # Show only ERROR
LOG_LEVEL=silent  # Disable all logs
```

**Default**:
- Development: `debug` (shows everything)
- Production: `info` (hides debug logs)

### LOG_NAMESPACES

Enable logging only for specific services (comma-separated):

```bash
# Only show logs from stripe and auth modules
LOG_NAMESPACES=stripe,auth

# Only show logs from wallet service
LOG_NAMESPACES=wallet

# Show all logs (default - no filter)
# (Don't set this variable)
```

**Use Cases**:
- Debugging a specific feature: `LOG_NAMESPACES=stripe`
- Debugging authentication flow: `LOG_NAMESPACES=auth,http`
- Debugging database: `LOG_NAMESPACES=database,wallet`

### LOG_DISABLED

Completely disable all logging:

```bash
LOG_DISABLED=true   # No logs at all
```

### LOG_METRICS

Enable performance metrics logging:

```bash
LOG_METRICS=true    # Show METRIC logs with timing
```

Metrics will show in magenta color and include execution time.

## Common Scenarios

### 1. Debug Only Stripe Integration

```bash
LOG_LEVEL=debug
LOG_NAMESPACES=stripe,stripe:service,stripe:mock
```

You'll see:
- ✅ All Stripe-related logs
- ❌ No auth, wallet, or other module logs

### 2. Production Mode (Minimal Logging)

```bash
LOG_LEVEL=info
# No LOG_NAMESPACES (show all)
```

You'll see:
- ✅ INFO, WARN, ERROR from all services
- ❌ No DEBUG logs

### 3. Debug Authentication Issues

```bash
LOG_LEVEL=debug
LOG_NAMESPACES=auth,http
```

You'll see:
- ✅ All auth module logs
- ✅ HTTP request/response logs
- ❌ Everything else hidden

### 4. Silent Mode (Testing/CI)

```bash
LOG_DISABLED=true
```

Completely silent - useful for unit tests.

## Available Namespaces

Current namespaces in the codebase:

- `http` - HTTP request/response logging
- `app` - General application logs (legacy)
- `stripe` - Stripe controller
- `stripe:service` - Stripe service layer
- `stripe:mock` - Mock Stripe client
- `auth` - Authentication module
- `wallet` - Wallet operations
- `database` - Database queries
- `[your-module]` - Any module you create

## Log Levels Explained

### DEBUG (Cyan)
Detailed information for diagnosing problems.

```typescript
logger.debug('User object retrieved', { userId, roles });
```

**When to use**: Internal state, variable values, step-by-step flow

### INFO (Green)
Confirmation that things are working as expected.

```typescript
logger.info('Payment processed successfully', { amount: 100 });
```

**When to use**: Important business events, successful operations

### WARN (Yellow)
Something unexpected happened, but the application continues.

```typescript
logger.warn('Retry attempt 3 of 5', { operation: 'webhook' });
```

**When to use**: Deprecated features, non-critical failures, unusual conditions

### ERROR (Red)
An error occurred that prevented an operation from completing.

```typescript
logger.error('Payment failed', error);
```

**When to use**: Exceptions, failed operations, critical issues

## HTTP Request Logging

All HTTP requests are automatically logged via the `loggingMiddleware`:

```
[2026-01-25T10:30:15.123Z] [http] [HTTP] POST /api/integrations/stripe/create-checkout-session 200 (45ms)
```

- Green: 2xx responses
- Yellow: 3xx responses
- Red: 4xx/5xx responses

Includes:
- HTTP method
- Path
- Status code
- Response time in milliseconds

## Best Practices

### 1. Use Appropriate Namespaces

```typescript
// ✅ Good - specific namespace
const logger = Logger.create('stripe:checkout');

// ❌ Bad - too generic
const logger = Logger.create('service');
```

### 2. Don't Log Sensitive Data

```typescript
// ❌ Bad - exposes API keys
logger.info('API call', { apiKey: process.env.STRIPE_KEY });

// ✅ Good - redact sensitive info
logger.info('API call', { provider: 'stripe' });
```

### 3. Use Structured Logging

```typescript
// ✅ Good - structured metadata
logger.info('User logged in', { userId: '123', timestamp: Date.now() });

// ❌ Bad - string interpolation
logger.info(`User 123 logged in at ${Date.now()}`);
```

### 4. Log at the Right Level

```typescript
// ✅ Good
logger.error('Payment failed', error);       // ERROR - failed operation
logger.warn('Retry attempt', { attempt: 3 }); // WARN - unusual but ok
logger.info('Payment processed');             // INFO - normal event
logger.debug('API response', { data });       // DEBUG - detailed info

// ❌ Bad
logger.info('Payment failed');  // Should be ERROR
logger.error('User clicked button');  // Should be DEBUG or INFO
```

### 5. Use Timers for Performance Tracking

```typescript
// ✅ Good - measure actual performance
const timer = logger.startTimer();
await heavyOperation();
timer.end('Heavy operation completed');

// ❌ Bad - manual timing
const start = Date.now();
await heavyOperation();
logger.info(`Took ${Date.now() - start}ms`);
```

## Example: Complete Module Logging

```typescript
// stripe.service.ts
import { Logger } from '../../utils/logger';

export class StripeService {
  private static logger = Logger.create('stripe:service');

  static async processPayment(amount: number) {
    this.logger.info('Processing payment', { amount });

    const timer = this.logger.startTimer();

    try {
      // Step 1
      this.logger.debug('Creating checkout session');
      const session = await this.createSession(amount);

      // Step 2
      this.logger.debug('Session created', { sessionId: session.id });

      timer.end('Payment processed successfully');
      return session;

    } catch (error) {
      this.logger.error('Payment processing failed', error);
      throw error;
    }
  }
}
```

## Troubleshooting

### Logs not appearing?

1. Check `LOG_DISABLED` is not set to `true`
2. Check your `LOG_LEVEL` - it might be filtering out your logs
3. Check `LOG_NAMESPACES` - your namespace might not be included

### Too many logs?

1. Increase `LOG_LEVEL` to `info` or `warn`
2. Set `LOG_NAMESPACES` to only the modules you care about
3. In production, ensure `NODE_ENV=production` (defaults to `info` level)

### Want colored output in production?

Remove `NODE_ENV=production` or set `NO_COLOR` to empty string. (Not recommended for production logs)

## Summary

**Quick Reference**:

```bash
# Development - See everything
LOG_LEVEL=debug

# Production - Minimal logging
LOG_LEVEL=info

# Debug specific service
LOG_NAMESPACES=stripe,auth

# Enable metrics
LOG_METRICS=true

# Silent mode
LOG_DISABLED=true
```

The logging system is designed to be flexible, non-intrusive, and easy to control. Use namespaces to organize logs, and use environment variables to focus on what matters.
