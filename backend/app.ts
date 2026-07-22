import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { getConfig } from './config';
import { createDatabase } from './core/storage/database';
import { createUserRepository } from './core/repositories/userRepository';
import { createSessionRepository } from './core/repositories/sessionRepository';
import { createMemoryRepository } from './core/repositories/memoryRepository';
import { createProcessedFileRepository } from './core/repositories/processedFileRepository';
import { createAuditRepository } from './core/repositories/auditRepository';
import { hashSessionToken } from './core/auth/sessions';
import { registerAuthRoutes } from './modules/auth/routes';
import { registerMemoryRoutes } from './modules/memory/routes';
import { registerProcessedFileRoutes } from './modules/processed-files/routes';
import { registerAuditRoutes } from './modules/audit/routes';
import { registerCommonLawRoutes } from './modules/common-law/routes';
import { registerLegalRoutes } from './modules/legal/routes';
import { registerDraftRoutes } from './modules/drafts/routes';
import { registerRegisterRoutes } from './modules/register/routes';
import { registerPackageRoutes } from './modules/packages/routes';

export async function createApp() {
  const config = getConfig();
  const app = Fastify({ logger: true });
  const db = createDatabase(config.ARBITER_DB_PATH);

  await app.register(cookie, { secret: config.ARBITER_SESSION_SECRET });
  app.decorate('db', db);
  app.decorate('userRepository', createUserRepository(db));
  app.decorate('sessionRepository', createSessionRepository(db));
  app.decorate('memoryRepository', createMemoryRepository(db));
  app.decorate('processedFileRepository', createProcessedFileRepository(db));
  app.decorate('auditRepository', createAuditRepository(db));
  app.decorate('authCookieName', config.ARBITER_SESSION_COOKIE);
  app.decorate('requireSession', async (request: any) => {
    const token = request.cookies?.[config.ARBITER_SESSION_COOKIE];
    if (!token) {
      const error = new Error('Unauthorized');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    const session = (app as any).sessionRepository.findActiveByTokenHash(hashSessionToken(token));
    const user = session ? (app as any).userRepository.findById(session.user_id) : undefined;

    if (!session || !user || user.disabled_at) {
      const error = new Error('Unauthorized');
      (error as Error & { statusCode?: number }).statusCode = 401;
      throw error;
    }

    return user;
  });
  await registerAuthRoutes(app);
  await registerMemoryRoutes(app);
  await registerProcessedFileRoutes(app);
  await registerAuditRoutes(app);
  await registerCommonLawRoutes(app);
  await registerLegalRoutes(app);
  await registerDraftRoutes(app);
  await registerRegisterRoutes(app);
  await registerPackageRoutes(app);

  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
