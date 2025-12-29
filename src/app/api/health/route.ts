import { NextResponse } from 'next/server';
import { healthCheck as comboHealthCheck } from '@/lib/clients/combo-service';

export async function GET() {
  const comboServiceHealthy = await comboHealthCheck();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      comboService: comboServiceHealthy,
    },
  });
}
