-- 2minutes V2.1.37 — image principale des articles
-- A exécuter une fois dans Supabase SQL Editor. Le script est réexécutable.

alter table public.tm_articles
  add column if not exists image_url text;

create or replace function public.list_article_views_v3(p_page_url text)
returns table(
  id uuid,
  other_url text,
  other_title text,
  other_domain text,
  other_image_url text,
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
    case when l.article_a=(select id from me) then b.image_url else a.image_url end as other_image_url,
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
  l.other_image_url,
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
 and e.source_article=l.other_id
left join votes v on v.excerpt_id=e.id
order by l.other_url, coalesce(v.score,0) desc, e.created_at desc nulls last;
$$;

create or replace function public.create_article_excerpt_v3(
  p_source_url text,
  p_source_title text,
  p_source_image_url text,
  p_target_url text,
  p_target_title text,
  p_target_image_url text,
  p_excerpt text,
  p_client_id uuid
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  sa uuid;
  ta uuid;
  aa uuid;
  bb uuid;
  ln uuid;
  eid uuid;
  su text:=trim(p_source_url);
  tu text:=trim(p_target_url);
  ex text:=regexp_replace(trim(p_excerpt),'\s+',' ','g');
  si text:=nullif(left(trim(coalesce(p_source_image_url,'')),4000),'');
  ti text:=nullif(left(trim(coalesce(p_target_image_url,'')),4000),'');
begin
  if su=tu then raise exception 'same article'; end if;
  if not tm_allowed(su) or not tm_allowed(tu) then raise exception 'unmanaged media'; end if;
  if char_length(ex)<12 or char_length(ex)>600 then raise exception 'invalid excerpt length'; end if;

  insert into tm_articles(canonical_url,domain,title,image_url)
  values(su,tm_domain(su),left(coalesce(p_source_title,''),500),si)
  on conflict(canonical_url) do update
    set title=case when excluded.title<>'' then excluded.title else tm_articles.title end,
        image_url=coalesce(tm_articles.image_url,excluded.image_url)
  returning id into sa;

  insert into tm_articles(canonical_url,domain,title,image_url)
  values(tu,tm_domain(tu),left(coalesce(p_target_title,''),500),ti)
  on conflict(canonical_url) do update
    set title=case when excluded.title<>'' then excluded.title else tm_articles.title end,
        image_url=coalesce(tm_articles.image_url,excluded.image_url)
  returning id into ta;

  if su<tu then aa:=sa;bb:=ta;else aa:=ta;bb:=sa;end if;
  insert into tm_article_links(article_a,article_b)
  values(aa,bb)
  on conflict(article_a,article_b) do update set article_a=excluded.article_a
  returning id into ln;

  insert into tm_article_excerpts(link_id,source_article,excerpt,created_by)
  values(ln,ta,ex,p_client_id)
  returning id into eid;

  return eid;
exception
  when unique_violation then raise exception 'duplicate excerpt';
end $$;

revoke all on function public.list_article_views_v3(text) from public;
revoke all on function public.create_article_excerpt_v3(text,text,text,text,text,text,text,uuid) from public;
grant execute on function public.list_article_views_v3(text) to anon,authenticated;
grant execute on function public.create_article_excerpt_v3(text,text,text,text,text,text,text,uuid) to anon,authenticated;
