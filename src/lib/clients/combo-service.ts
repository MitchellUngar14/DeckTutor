import type { ComboCheckRequest, ComboCheckResponse } from '@/types';

const COMBO_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export class ComboServiceError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ComboServiceError';
  }
}

export async function checkCombos(request: ComboCheckRequest): Promise<ComboCheckResponse> {
  const response = await fetch(`${COMBO_SERVICE_URL}/combos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new ComboServiceError(
      `Combo service error: ${response.status}`,
      response.status
    );
  }

  return response.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${COMBO_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
