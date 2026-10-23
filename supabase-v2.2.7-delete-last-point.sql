-- 2Minutes V2.2.7 - suppression d'un dernier point de vue visible.
-- A exécuter manuellement dans Supabase SQL Editor.
-- En particulier, un lien V2 peut contenir un extrait A et un extrait B;
-- retirer le dernier extrait du côté B peut laisser un extrait A et une carte vide.
-- La liaison sera retirée lorsque plus aucun extrait du côté supprimé ne reste,
-- À CONDITION que les éventuels extraits opposés appartiennent au même auteur.
-- Contributions des autres auteurs : jamais supprimées.
-- Les articles ne sont jamais supprimés. Les votes d'extraits retirés sont
-- éliminés par les clés étrangères existantes ON DELETE CASCADE.

begin;

-- Empêche toute ambiguïté de signature PostgREST PGRST203.
drop function if exists public.delete_article_excerpt_v2(text, uuid);

create or replace function public.delete_article_excerpt_v2(
 p_excerpt_id uuid,
 p_client_id uuid
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
 v_link uuid;
 v_article uuid;
 v_author uuid;
 v_others integer;
 v_remaining_this_side integer;
 v_other_authors integer;
begin
 -- D'abord identifier la liaison, ensuite verrouiller sa ligne.
 select e.link_id into v_link
 from public.tm_article_excerpts e
 where e.id=p_excerpt_id and e.created_by=p_client_id;
 if v_link is null then return false; end if;

 perform 1 from public.tm_article_links l where l.id=v_link for update;
 if not found then return false; end if;

 -- Relire sous verrou : le passage peut avoir changé entre-temps.
 select e.source_article, e.created_by into v_article,v_author
 from public.tm_article_excerpts e
 where e.id=p_excerpt_id and e.created_by=p_client_id and e.link_id=v_link
 for update;
 if v_article is null then return false; end if;

 delete from public.tm_article_excerpts e
 where e.id=p_excerpt_id and e.created_by=p_client_id and e.link_id=v_link;
 if not found then return false; end if;

 select count(*) into v_others
 from public.tm_article_excerpts e where e.link_id=v_link;
 if v_others=0 then
   delete from public.tm_article_links where id=v_link;
   return true;
 end if;

 -- Le dernier passage du côté que l'utilisateur vient d'effacer ?
 select count(*) into v_remaining_this_side
 from public.tm_article_excerpts e
 where e.link_id=v_link and e.source_article=v_article;

 if v_remaining_this_side=0 then
   -- Ne jamais détruire les extraits ou votes d'autres contributeurs.
   select count(*) into v_other_authors
   from public.tm_article_excerpts e
   where e.link_id=v_link and e.created_by<>p_client_id;
   if v_other_authors=0 then
     -- Seuls les éventuels passages réciproques du même utilisateur restent.
     -- Leur suppression rend le lien réellement vide puis l'efface.
     delete from public.tm_article_links where id=v_link;
   end if;
 end if;
 return true;
end;
$$;

revoke all on function public.delete_article_excerpt_v2(uuid,uuid) from public;
grant execute on function public.delete_article_excerpt_v2(uuid,uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;

-- Diagnostic non destructif, utile pour détecter des liaisons déjà vides :
select l.id as link_id, count(e.id) as passages_restants
from public.tm_article_links l
left join public.tm_article_excerpts e on e.link_id=l.id
group by l.id
having count(e.id)=0;
