-- 2minutes Web/PWA 1.0.6: API publique de consultation des articles récents.
-- À exécuter manuellement dans le SQL Editor de Supabase, après contrôle.
-- Ne crée ni ne modifie aucune ligne dans les tables existantes.
create or replace function public.list_recent_articles_public_v1(p_search text default '', p_limit integer default 50)
returns table(url text,title text,domain text,last_linked_at timestamptz,linked_articles jsonb)
language sql stable security definer set search_path=public as $$
with candidates as (
 select a.id,a.canonical_url,a.title,a.domain,max(l.created_at) as last_at
 from public.tm_articles a
 join public.tm_article_links l on l.article_a=a.id or l.article_b=a.id
 where length(trim(coalesce(p_search,'')))<2
   or a.title ilike '%'||replace(replace(replace(left(trim(p_search),100),'\','\\'),'%','\%'),'_','\_')||'%' escape '\'
 group by a.id,a.canonical_url,a.title,a.domain
 order by max(l.created_at) desc,a.id
 limit least(greatest(coalesce(p_limit,50),1),50)
), pairs as (
 select c.id as source_id, other.id as other_id,other.canonical_url as other_url,other.title as other_title,other.domain as other_domain,l.id as link_id,l.created_at,
   best.excerpt,best.upvotes,best.downvotes,best.score
 from candidates c
 join public.tm_article_links l on l.article_a=c.id or l.article_b=c.id
 join public.tm_articles other on other.id=case when l.article_a=c.id then l.article_b else l.article_a end
 left join lateral (
  select e.excerpt, count(v.*) filter(where v.value=1)::integer as upvotes,
  count(v.*) filter(where v.value=-1)::integer as downvotes,
  coalesce(sum(v.value),0)::integer as score
  from public.tm_article_excerpts e
  left join public.tm_excerpt_votes v on v.excerpt_id=e.id
  where e.link_id=l.id and e.source_article=other.id
  group by e.id,e.excerpt,e.created_at
  order by coalesce(sum(v.value),0) desc,e.created_at desc limit 1
 ) best on true
), ranked as (
 select p.*,row_number() over(partition by p.source_id order by p.created_at desc,p.other_url) as rn from pairs p
)
select c.canonical_url,c.title,c.domain,c.last_at,coalesce((
 select jsonb_agg(jsonb_build_object('url',r.other_url,'title',r.other_title,'domain',r.other_domain,
 'excerpt',r.excerpt,'upvotes',coalesce(r.upvotes,0),'downvotes',coalesce(r.downvotes,0)) order by r.created_at desc,r.other_url)
 from ranked r where r.source_id=c.id and r.rn<=5
),'[]'::jsonb)
from candidates c order by c.last_at desc,c.id;
$$;
revoke all on function public.list_recent_articles_public_v1(text,integer) from public;
grant execute on function public.list_recent_articles_public_v1(text,integer) to anon,authenticated;
