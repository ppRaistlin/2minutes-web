-- 2minutes V2.1.25 — robust author-only excerpt deletion
-- Safe to rerun. This deliberately preserves the A<->B article link.

create or replace function public.delete_article_excerpt_v2(
  p_excerpt_id uuid,
  p_client_id uuid
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  n integer := 0;
begin
  delete from tm_article_excerpts
  where id=p_excerpt_id
    and created_by=p_client_id;

  get diagnostics n = row_count;
  return n=1;
end;
$$;

revoke all on function public.delete_article_excerpt_v2(uuid,uuid) from public;
grant execute on function public.delete_article_excerpt_v2(uuid,uuid) to anon,authenticated;
