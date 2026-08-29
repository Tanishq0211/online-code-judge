-- Prisma can't manage CHECK constraints (schema.prisma only notes them), so the
-- role allow-list has to be reconciled out-of-band. The migrate service runs this
-- after `prisma db push` on every startup. Idempotent: safe to re-run.
-- 'moderator' is a first-class role in the API (routes' MUTATE_ROLES, make-admin),
-- so it MUST be permitted here — otherwise promoting a user to moderator throws 23514.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'moderator', 'admin'));
