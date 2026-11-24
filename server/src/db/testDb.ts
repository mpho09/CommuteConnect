import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readdir, readFile } from 'node:fs/promises'

const SUPABASE_DIR = new URL('../../../supabase/', import.meta.url)

/**
 * The parts of a Supabase database our migrations rely on, for running them
 * on an in-memory Postgres (PGlite) in tests. Real projects already have these.
 */
const SUPABASE_STUB = `
  create schema auth;
  create schema extensions;
  create extension pgcrypto with schema extensions;

  create table auth.users (
    instance_id uuid,
    id uuid primary key,
    aud varchar(255),
    role varchar(255),
    email varchar(255),
    encrypted_password varchar(255),
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    confirmation_token varchar(255),
    recovery_token varchar(255),
    email_change_token_new varchar(255),
    email_change varchar(255)
  );

  create table auth.identities (
    id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    provider_id text not null,
    identity_data jsonb not null,
    provider text not null,
    last_sign_in_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
  );
`

export async function migrationFiles(): Promise<string[]> {
  const dir = new URL('migrations/', SUPABASE_DIR)
  return (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
}

/** Fresh in-memory database with all migrations applied (and optionally the seed). */
export async function createTestDb({ seed = false } = {}): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } })
  await db.exec(SUPABASE_STUB)
  for (const file of await migrationFiles()) {
    await db.exec(await readFile(new URL(`migrations/${file}`, SUPABASE_DIR), 'utf8'))
  }
  if (seed) await db.exec(await readFile(new URL('seed.sql', SUPABASE_DIR), 'utf8'))
  return db
}
