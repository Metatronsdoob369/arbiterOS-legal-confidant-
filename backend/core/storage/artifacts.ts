import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_ROOT = path.resolve('data/artifacts');

function sanitizePathSegment(segment: string) {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function ensureUserArtifactDir(userId: string, domain: string) {
  const dir = path.join(ARTIFACT_ROOT, sanitizePathSegment(domain), sanitizePathSegment(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function createArtifactPath(userId: string, domain: string, filename: string) {
  const artifactDir = ensureUserArtifactDir(userId, domain);
  const safeFilename = path.basename(filename);
  return path.join(artifactDir, safeFilename);
}
