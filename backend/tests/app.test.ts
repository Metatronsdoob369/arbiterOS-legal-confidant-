import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

describe('backend app', () => {
  it('responds to GET /api/health', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
