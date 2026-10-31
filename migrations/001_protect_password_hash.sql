-- Existing installations only: apply once after reviewing current grants.
-- No rows, tables, columns, or existing RLS policies are deleted.
begin;

grant usage on schema public to anon, authenticated, service_role;
revoke all on table public.memos from public, anon, authenticated;
revoke select (password_hash) on public.memos from public, anon, authenticated;
grant select (id, title, content, created_at) on public.memos to anon, authenticated;
grant insert on table public.memos to anon, authenticated;
grant select, insert, delete on table public.memos to service_role;

commit;
