import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyPassword } from '../../core/auth/passwords';
import { createSessionRecord, hashSessionToken } from '../../core/auth/sessions';

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(256),
}).strict();

function unauthorizedError(message = 'Unauthorized') {
  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = 401;
  return error;
}

function getCookieOptions(cookieName: string) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 12,
    name: cookieName,
  };
}

async function resolveAuthenticatedUser(app: FastifyInstance, request: FastifyRequest) {
  const cookieName = (app as any).authCookieName as string;
  const token = request.cookies?.[cookieName];

  if (!token) {
    throw unauthorizedError();
  }

  const sessionRepository = (app as any).sessionRepository;
  const userRepository = (app as any).userRepository;
  const session = sessionRepository.findActiveByTokenHash(hashSessionToken(token));

  if (!session) {
    throw unauthorizedError();
  }

  const user = userRepository.findById(session.user_id);
  if (!user || user.disabled_at) {
    throw unauthorizedError();
  }

  return { user, session };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsedBody = LoginSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ message: 'Invalid login payload' });
    }

    const { username, password } = parsedBody.data;
    const userRepository = (app as any).userRepository;
    const sessionRepository = (app as any).sessionRepository;
    const user = userRepository.findByUsername(username);

    if (!user || user.disabled_at || !(await verifyPassword(user.password_hash, password))) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const session = createSessionRecord(user.id);
    sessionRepository.insert(session.record);
    userRepository.updateLastLoginAt(user.id, session.record.created_at);

    reply.setCookie((app as any).authCookieName, session.publicToken, getCookieOptions((app as any).authCookieName));

    return {
      user: {
        username: user.username,
        role: user.role,
      },
    };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const { session } = await resolveAuthenticatedUser(app, request);
    (app as any).sessionRepository.revokeById(session.id, new Date().toISOString());
    reply.clearCookie((app as any).authCookieName, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request) => {
    const { user } = await resolveAuthenticatedUser(app, request);
    return {
      user: {
        username: user.username,
        role: user.role,
      },
    };
  });
}
