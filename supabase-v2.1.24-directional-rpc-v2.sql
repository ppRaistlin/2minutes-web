-- 2minutes V2.1.24 — directional linked-article RPCs (new names to avoid stale RPC definitions)
-- Run once in Supabase SQL Editor. Safe to rerun.

create or replace function public.list_article_views_v2(p_page_url text)
returns table(
  id uuid,
  other_url text,
  other_title text,
  other_domain text,
  excerpt text,
  score bigint,
  upvotes bigint,
  downvotes bigint,
  confirmed boolean,
  created_at timestamptz,
  created_by uuid
)
language sql stable security definer set search_path=public as $$
with me as (
  select id from tm_articles where canonical_url=p_page_url limit 1
), links as (
  select
    l.id as link_id,
    case when l.article_a=(select id from me) then b.id else a.id end as other_id,
    case when l.article_a=(select id from me) then b.canonical_url else a.canonical_url end as other_url,
    case when l.article_a=(select id from me) then b.title else a.title end as other_title,
    case when l.article_a=(select id from me) then b.domain else a.domain end as other_domain,
    l.created_at as link_created_at
  from tm_article_links l
  join tm_articles a on a.id=l.article_a
  join tm_articles b on b.id=l.article_b
  where l.article_a=(select id from me) or l.article_b=(select id from me)
), votes as (
  select
    excerpt_id,
    count(*) filter(where value=1)::bigint as up,
    count(*) filter(where value=-1)::bigint as down,
    coalesce(sum(value),0)::bigint as score
  from tm_excerpt_votes
  group by excerpt_id
)
select
  e.id,
  l.other_url,
  l.other_title,
  l.other_domain,
  e.excerpt,
  coalesce(v.score,0)::bigint as score,
  coalesce(v.up,0)::bigint as upvotes,
  coalesce(v.down,0)::bigint as downvotes,
  (coalesce(v.score,0)>=3) as confirmed,
  coalesce(e.created_at,l.link_created_at) as created_at,
  e.created_by
from links l
left join tm_article_excerpts e
  on e.link_id=l.link_id
 -- IMPORTANT: viewed from article A, only excerpts whose SOURCE is article B are displayed.
 -- Viewed from B, only excerpts whose SOURCE is article A are displayed.
 and e.source_article=l.other_id
left join votes v on v.excerpt_id=e.id
order by l.other_url, coalesce(v.score,0) desc, e.created_at desc nulls last;
$$;

create or replace function public.list_pair_target_excerpts_v2(p_source_url text,p_target_url text)
returns table(id uuid, excerpt text, score bigint, confirmed boolean, created_at timestamptz)
language sql stable security definer set search_path=public as $$
with target as (
  select id from tm_articles where canonical_url=p_target_url limit 1
), pair_link as (
  select l.id
  from tm_article_links l
  join tm_articles a on a.id=l.article_a
  join tm_articles b on b.id=l.article_b
  where (a.canonical_url=p_source_url and b.canonical_url=p_target_url)
     or (a.canonical_url=p_target_url and b.canonical_url=p_source_url)
  limit 1
)
select
  e.id,
  e.excerpt,
  coalesce(sum(v.value),0)::bigint as score,
  (coalesce(sum(v.value),0)>=3) as confirmed,
  e.created_at
from tm_article_excerpts e
left join tm_excerpt_votes v on v.excerpt_id=e.id
where e.link_id=(select id from pair_link)
  and e.source_article=(select id from target)
group by e.id
order by 3 desc,e.created_at desc;
$$;

revoke all on function public.list_article_views_v2(text) from public;
revoke all on function public.list_pair_target_excerpts_v2(text,text) from public;
grant execute on function public.list_article_views_v2(text) to anon,authenticated;
grant execute on function public.list_pair_target_excerpts_v2(text,text) to anon,authenticated;
