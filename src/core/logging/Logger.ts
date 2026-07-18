type LogContext = Record<string, unknown>;

type LoggerMethod = (message: string, context?: LogContext) => void;

function write(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext) {
  const payload = {
    level,
    message,
    context,
    timestamp: new Date().toISOString()
  };

  if (level === 'debug' && import.meta.env.PROD) {
    return;
  }

  console[level](payload);
}

export const Logger: Record<'info' | 'warn' | 'error' | 'debug', LoggerMethod> = {
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
  debug: (message, context) => write('debug', message, context)
};
