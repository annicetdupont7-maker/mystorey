create type public.store_status as enum ('draft', 'published');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 500),
  logo_url text,
  cover_url text,
  status public.store_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_themes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  preset_id text not null check (preset_id in ('elegant','minimal','luxury','modern','bold','natural','colorful')),
  overrides jsonb not null default '{}'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_owner_id_idx on public.stores(owner_id);
create index stores_public_slug_idx on public.stores(slug) where status = 'published';

create function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger stores_updated_at before update on public.stores for each row execute procedure public.set_updated_at();
create trigger store_themes_updated_at before update on public.store_themes for each row execute procedure public.set_updated_at();

create function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_themes enable row level security;

revoke all on public.profiles, public.stores, public.store_themes from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.store_themes to authenticated;

create policy "profile owner reads profile" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profile owner updates profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner reads own stores" on public.stores for select to authenticated using (owner_id = auth.uid());
create policy "public reads published stores" on public.stores for select to anon, authenticated using (status = 'published');
create policy "owner creates own stores" on public.stores for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates own stores" on public.stores for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes own stores" on public.stores for delete to authenticated using (owner_id = auth.uid());
create policy "owner reads own themes" on public.store_themes for select to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "public reads published themes" on public.store_themes for select to anon, authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.status = 'published'));
create policy "owner creates themes" on public.store_themes for insert to authenticated with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner updates themes" on public.store_themes for update to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "owner deletes themes" on public.store_themes for delete to authenticated using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

create function public.create_store_with_theme(store_name text, store_slug text, theme_preset text)
returns public.stores language plpgsql security definer set search_path = public as $$
declare created_store public.stores;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.stores (owner_id, name, slug) values (auth.uid(), store_name, store_slug) returning * into created_store;
  insert into public.store_themes (store_id, preset_id) values (created_store.id, theme_preset);
  return created_store;
end;
$$;
revoke all on function public.create_store_with_theme(text, text, text) from public;
grant execute on function public.create_store_with_theme(text, text, text) to authenticated;
