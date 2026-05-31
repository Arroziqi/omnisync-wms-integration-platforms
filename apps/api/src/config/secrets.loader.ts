import * as fs from 'fs';
import * as path from 'path';

/**
 * loadDockerSecrets
 * 
 * Synchronous utility run at bootstrap to read Docker file-based secrets
 * mounted at /run/secrets/ and map them into process.env.
 * 
 * In production, file-based secrets are mounted at:
 *   /run/secrets/db_password
 *   /run/secrets/redis_password
 *   /run/secrets/jwt_secret
 *   /run/secrets/tiktok_app_secret
 *   /run/secrets/shopee_partner_key
 *   /run/secrets/lazada_app_secret
 */
export function loadDockerSecrets(): void {
  const secretsDir = '/run/secrets';

  // Map each secret file name to its target environment variable
  const secretMappings: { [key: string]: string } = {
    jwt_secret: 'JWT_SECRET',
    redis_password: 'REDIS_PASSWORD',
    db_password: 'DATABASE_PASSWORD',
    tiktok_app_secret: 'TIKTOK_APP_SECRET',
    shopee_partner_key: 'SHOPEE_PARTNER_KEY',
    lazada_app_secret: 'LAZADA_APP_SECRET',
  };

  // 1. Read secrets from standard Docker Secrets path (/run/secrets/*)
  for (const [secretName, envVar] of Object.entries(secretMappings)) {
    const secretPath = path.join(secretsDir, secretName);
    if (fs.existsSync(secretPath)) {
      try {
        const val = fs.readFileSync(secretPath, 'utf8').trim();
        if (val) {
          process.env[envVar] = val;
        }
      } catch (err) {
        console.error(`[SecretsLoader] Failed to read secret: ${secretName} from ${secretPath}`, err);
      }
    }
  }

  // 2. Read secrets from environment variables pointing to secret files (e.g. *_FILE)
  const fileEnvVars = [
    { fileVar: 'JWT_SECRET_FILE', targetVar: 'JWT_SECRET' },
    { fileVar: 'REDIS_PASSWORD_FILE', targetVar: 'REDIS_PASSWORD' },
    { fileVar: 'DB_PASSWORD_FILE', targetVar: 'DATABASE_PASSWORD' },
  ];

  for (const { fileVar, targetVar } of fileEnvVars) {
    const filePath = process.env[fileVar];
    if (filePath && fs.existsSync(filePath)) {
      try {
        const val = fs.readFileSync(filePath, 'utf8').trim();
        if (val) {
          process.env[targetVar] = val;
        }
      } catch (err) {
        console.error(`[SecretsLoader] Failed to read ${fileVar} at ${filePath}`, err);
      }
    }
  }

  // 3. Reconstruct or patch DATABASE_URL with resolved password
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const password = process.env.DATABASE_PASSWORD;
    if (password) {
      // Replace safe placeholders or legacy compose shell expressions
      const encodedPassword = encodeURIComponent(password);
      if (dbUrl.includes('_DB_PASSWORD_PLACEHOLDER_')) {
        dbUrl = dbUrl.replace('_DB_PASSWORD_PLACEHOLDER_', encodedPassword);
      } else if (dbUrl.includes('$(cat /run/secrets/db_password)')) {
        dbUrl = dbUrl.replace('$(cat /run/secrets/db_password)', encodedPassword);
      }
      process.env.DATABASE_URL = dbUrl;
    }
  }
}
