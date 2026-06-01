// Single source of truth for the JWT signing secret.
//
// Kept dependency-free (only reads process.env) so it is safe to import from
// proxy.ts, which runs in the Edge runtime on Vercel where Node built-ins are
// unavailable.
//
// In production a real JWT_SECRET MUST be provided via the environment — there
// is intentionally no hardcoded fallback, so a leaked source tree can never be
// used to forge tokens. Local development falls back to an obviously-insecure
// dev secret only when NODE_ENV !== 'production'.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-insecure-jwt-secret-do-not-use-in-prod';
  }

  throw new Error(
    'JWT_SECRET is not set. Configure it in your hosting environment (e.g. Vercel → Settings → Environment Variables) before deploying.'
  );
}
