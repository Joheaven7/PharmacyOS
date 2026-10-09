export const logger = {
  info: (message: string, meta: Record<string, unknown> = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta: Record<string, unknown> = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: unknown, meta: Record<string, unknown> = {}) => {
    console.error(
      `[ERROR] [${new Date().toISOString()}] ${message}`,
      error instanceof Error ? error.stack : error,
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    );
  },
};
