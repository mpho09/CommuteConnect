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

  -- Data API roles
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;

  -- As in Supabase: the user id from the request's JWT claims
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ), '')::uuid
  $$;

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

/** Older Supabase projects grant every new public table to the Data API roles; newer ones can opt out. */
const AUTO_EXPOSE = `
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`

/** Fresh in-memory database with all migrations applied (and optionally the seed). */
export async function createTestDb({
  seed = false,
  autoExposeTables = true,
} = {}): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } })
  await db.exec(SUPABASE_STUB)
  if (autoExposeTables) await db.exec(AUTO_EXPOSE)
  for (const file of await migrationFiles()) {
    await db.exec(await readFile(new URL(`migrations/${file}`, SUPABASE_DIR), 'utf8'))
  }
  if (seed) await db.exec(await readFile(new URL('seed.sql', SUPABASE_DIR), 'utf8'))
  return db
}
