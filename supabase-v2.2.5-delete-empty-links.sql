-- 2Minutes v2.2.5 — Supprimer la liaison devenue vide
-- Migration à exécuter manuellement dans Supabase SQL Editor.
-- Compatible avec la signature de delete_article_excerpt_v2(uuid, uuid).
-- Les articles, médias et autres liaisons ne sont jamais supprimés.
-- Ne supprimer la liaison A-B que si aucun extrait (A ou B) n'y reste.

begin;

create or replace function public.delete_article_excerpt_v2(
  p_excerpt_id uuid,
  p_client_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_count integer := 0;
begin
  -- Localiser un passage appartenant au demandeur. Aucun effet sinon.
  select e.link_id into v_link_id
  from public.tm_article_excerpts e
  where e.id = p_excerpt_id
    and e.created_by = p_client_id;

  if v_link_id is null then
    return false;
  end if;

  -- Sérialiser la suppression avec les écritures sur la même liaison.
  perform 1 from public.tm_article_links l
  where l.id = v_link_id
  for update;

  delete from public.tm_article_excerpts e
  where e.id = p_excerpt_id
    and e.created_by = p_client_id
    and e.link_id = v_link_id;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    return false;
  end if;

  -- Les votes liés au passage sont supprimés par leur FK ON DELETE CASCADE.
  -- Conserver la liaison si un passage existe encore dans l'un des deux sens.
  delete from public.tm_article_links l
  where l.id = v_link_id
    and not exists (
      select 1 from public.tm_article_excerpts e
      where e.link_id = l.id
    );

  return true;
end;
$$;

revoke all on function public.delete_article_excerpt_v2(uuid, uuid) from public;
grant execute on function public.delete_article_excerpt_v2(uuid, uuid) to anon, authenticated;

commit;
