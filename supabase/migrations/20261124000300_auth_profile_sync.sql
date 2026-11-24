-- Create a profile and roles when Supabase Auth creates a user.
-- Sign-up metadata (raw_user_meta_data) comes from the browser, so it is
-- treated as untrusted: only commuter/operator roles can be requested, never
-- admin, and the name is trimmed and length-limited.

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := left(btrim(coalesce(meta ->> 'full_name', '')), 80);
  requested text[];
begin
  if name = '' then
    name := split_part(coalesce(new.email, 'New user'), '@', 1);
  end if;

  insert into public.profiles (id, full_name, terms_accepted_at)
  values (
    new.id,
    name,
    -- compare as text: a malformed value must not break sign-up
    case when meta ->> 'accepted_terms' = 'true' then now() end
  );

  select coalesce(array_agg(distinct r), '{}')
    into requested
    from jsonb_array_elements_text(
      case when jsonb_typeof(meta -> 'roles') = 'array' then meta -> 'roles' else '[]'::jsonb end
    ) as r
   where r in ('commuter', 'operator');

  if cardinality(requested) = 0 then
    requested := array['commuter'];
  end if;

  insert into public.user_roles (user_id, role)
  select new.id, r::public.app_role from unnest(requested) as r;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
