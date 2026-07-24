import type { FastifyInstance } from 'fastify';
import { getPrimerPackage, listPrimerPackages } from '../../core/legal/primerPackages';

export async function registerPackageRoutes(app: FastifyInstance) {
  app.get('/api/packages', async (request) => {
    await (app as any).requireSession(request);
    return { packages: listPrimerPackages() };
  });

  app.get('/api/packages/:id', async (request, reply) => {
    await (app as any).requireSession(request);
    const { id } = request.params as { id: string };
    try {
      return getPrimerPackage(id);
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : 'Package not found',
      });
    }
  });
}
