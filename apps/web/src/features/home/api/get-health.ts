import { z } from 'zod';

import { apiRequest } from '../../../api/http-client';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest('/health', healthResponseSchema);
}
