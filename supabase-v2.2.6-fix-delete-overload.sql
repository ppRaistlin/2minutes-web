-- 2Minutes v2.2.6 — résolution de l'ambiguïté PGRST203.
-- Une ancienne surcharge (text, uuid) entre en conflit avec la fonction
-- de suppression actuelle (uuid, uuid) lors des appels RPC nommés.
-- Ce script ne supprime AUCUN article, point de vue ni vote.
-- Exécuter manuellement une seule fois dans Supabase > SQL Editor.

begin;

-- Sécurité : ne rien changer si la fonction cible n'existe pas.
do $$
begin
  if to_regprocedure('public.delete_article_excerpt_v2(uuid,uuid)') is null then
    raise exception 'Fonction delete_article_excerpt_v2(uuid,uuid) introuvable. Appliquer d’abord la migration v2.2.5.';
  end if;
end $$;

-- Supprimer uniquement la signature héritée, pas la fonction actuelle.
-- Ne pas utiliser CASCADE : une dépendance inattendue doit provoquer
-- un échec plutôt qu'une suppression involontaire.
drop function if exists public.delete_article_excerpt_v2(text,uuid);

-- Permissions explicites de la fonction conservée.
revoke all on function public.delete_article_excerpt_v2(uuid,uuid) from public;
grant execute on function public.delete_article_excerpt_v2(uuid,uuid) to anon,authenticated;

-- Demander à PostgREST de recharger son cache de signatures.
notify pgrst, 'reload schema';

commit;

-- Vérification lecture seule : une seule signature doit subsister.
select
  p.oid::regprocedure as signature,
  pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'delete_article_excerpt_v2'
order by 1;
