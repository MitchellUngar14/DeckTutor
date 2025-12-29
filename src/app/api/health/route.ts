import { NextResponse } from 'next/server';
import { healthCheck as commanderSpellbookHealthCheck } from '@/lib/clients/combo-service';
import { cacheHealthCheck } from '@/lib/cache';

export async function GET() {
  const [commanderSpellbookHealthy, redisHealthy] = await Promise.all([
    commanderSpellbookHealthCheck(),
    cacheHealthCheck(),
  ]);

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      redis: redisHealthy,
      commanderSpellbook: commanderSpellbookHealthy,
    },
  });
}
