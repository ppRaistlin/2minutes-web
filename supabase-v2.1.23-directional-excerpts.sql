-- 2minutes V2.1.23 — directional excerpts on bidirectional links
-- Run once in Supabase SQL Editor. Safe to rerun.

create or replace function public.list_article_excerpts(p_page_url text)
returns table(id uuid, other_url text, other_title text, other_domain text, excerpt text, score bigint, upvotes bigint, downvotes bigint, confirmed boolean, created_at timestamptz, created_by uuid)
language sql stable security definer set search_path=public as $$
with me as (
  select id from tm_articles where canonical_url=p_page_url
), links as (
  select l.id link_id,
         case when l.article_a=(select id from me) then b.id else a.id end other_id,
         case when l.article_a=(select id from me) then b.canonical_url else a.canonical_url end other_url,
         case when l.article_a=(select id from me) then b.title else a.title end other_title,
         case when l.article_a=(select id from me) then b.domain else a.domain end other_domain,
         l.created_at link_created_at
  from tm_article_links l
  join tm_articles a on a.id=l.article_a
  join tm_articles b on b.id=l.article_b
  where l.article_a=(select id from me) or l.article_b=(select id from me)
), v as (
  select excerpt_id,
         count(*) filter(where value=1) up,
         count(*) filter(where value=-1) down,
         sum(value)::bigint score
  from tm_excerpt_votes
  group by excerpt_id
)
select e.id,
       l.other_url,
       l.other_title,
       l.other_domain,
       e.excerpt,
       coalesce(v.score,0),
       coalesce(v.up,0),
       coalesce(v.down,0),
       (coalesce(v.score,0)>=3),
       coalesce(e.created_at,l.link_created_at),
       e.created_by
from links l
left join tm_article_excerpts e
  on e.link_id=l.link_id
 and e.source_article=l.other_id
left join v on v.excerpt_id=e.id
order by l.other_url, coalesce(v.score,0) desc, e.created_at desc nulls last;
$$;

create or replace function public.list_pair_excerpts(p_source_url text,p_target_url text)
returns table(id uuid, excerpt text, score bigint, confirmed boolean, created_at timestamptz)
language sql stable security definer set search_path=public as $$
with target as (
  select id from tm_articles where canonical_url=p_target_url
)
select e.id,
       e.excerpt,
       coalesce(sum(v.value),0)::bigint,
       (coalesce(sum(v.value),0)>=3),
       e.created_at
from tm_article_excerpts e
join tm_article_links l on l.id=e.link_id
join tm_articles a on a.id=l.article_a
join tm_articles b on b.id=l.article_b
left join tm_excerpt_votes v on v.excerpt_id=e.id
where ((a.canonical_url=p_source_url and b.canonical_url=p_target_url)
    or (a.canonical_url=p_target_url and b.canonical_url=p_source_url))
  and e.source_article=(select id from target)
group by e.id
order by 3 desc,e.created_at desc;
$$;

revoke all on function public.list_article_excerpts(text) from public;
revoke all on function public.list_pair_excerpts(text,text) from public;
grant execute on function public.list_article_excerpts(text) to anon,authenticated;
grant execute on function public.list_pair_excerpts(text,text) to anon,authenticated;
