const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface HealthResponse {
  name: string;
  version: string;
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latencyMs?: number;
      error?: string;
    };
  };
}

export async function fetchHealthStatus(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Health API returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      name: 'PharmacyOS API',
      version: '1.0.0',
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: 0,
      environment: 'unknown',
      services: {
        database: {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Backend unreachable',
        },
      },
    };
  }
}
