-- 2minutes V2.1.3 migration
begin;
drop function if exists public.list_article_excerpts(text);
create function public.list_article_excerpts(p_page_url text)
returns table(id uuid, other_url text, other_title text, other_domain text, excerpt text, score bigint, upvotes bigint, downvotes bigint, confirmed boolean, created_at timestamptz, created_by uuid)
language sql stable security definer set search_path=public as $$
with me as (select id from tm_articles where canonical_url=p_page_url), rows as (
 select e.id,
 case when l.article_a=(select id from me) then b.canonical_url else a.canonical_url end other_url,
 case when l.article_a=(select id from me) then b.title else a.title end other_title,
 case when l.article_a=(select id from me) then b.domain else a.domain end other_domain,
 e.excerpt,e.created_at,e.created_by
 from tm_article_links l join tm_articles a on a.id=l.article_a join tm_articles b on b.id=l.article_b join tm_article_excerpts e on e.link_id=l.id
 where l.article_a=(select id from me) or l.article_b=(select id from me)
), v as (select excerpt_id,count(*) filter(where value=1) up,count(*) filter(where value=-1) down,sum(value)::bigint score from tm_excerpt_votes group by excerpt_id)
select r.id,r.other_url,r.other_title,r.other_domain,r.excerpt,coalesce(v.score,0),coalesce(v.up,0),coalesce(v.down,0),(coalesce(v.score,0)>=3),r.created_at,r.created_by
from rows r left join v on v.excerpt_id=r.id order by coalesce(v.score,0) desc,r.created_at desc;
$$;
create or replace function public.create_article_excerpt(p_source_url text,p_source_title text,p_target_url text,p_target_title text,p_excerpt text,p_client_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare sa uuid;ta uuid;aa uuid;bb uuid;ln uuid;eid uuid; su text:=trim(p_source_url);tu text:=trim(p_target_url);ex text:=regexp_replace(trim(p_excerpt),'\s+',' ','g'); begin
 if su=tu then raise exception 'same article'; end if;
 if not tm_allowed(su) or not tm_allowed(tu) then raise exception 'unmanaged media'; end if;
 if char_length(ex)<12 or char_length(ex)>300 then raise exception 'invalid excerpt length'; end if;
 insert into tm_articles(canonical_url,domain,title) values(su,tm_domain(su),left(coalesce(p_source_title,''),500)) on conflict(canonical_url) do update set title=case when excluded.title<>'' then excluded.title else tm_articles.title end returning id into sa;
 insert into tm_articles(canonical_url,domain,title) values(tu,tm_domain(tu),left(coalesce(p_target_title,''),500)) on conflict(canonical_url) do update set title=case when excluded.title<>'' then excluded.title else tm_articles.title end returning id into ta;
 if su<tu then aa:=sa;bb:=ta;else aa:=ta;bb:=sa;end if;
 insert into tm_article_links(article_a,article_b) values(aa,bb) on conflict(article_a,article_b) do update set article_a=excluded.article_a returning id into ln;
 insert into tm_article_excerpts(link_id,source_article,excerpt,created_by) values(ln,ta,ex,p_client_id) returning id into eid; return eid;
 exception when unique_violation then raise exception 'duplicate excerpt';
end $$;
create or replace function public.delete_article_excerpt(p_excerpt_id uuid,p_client_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin
 delete from tm_article_excerpts where id=p_excerpt_id and created_by=p_client_id;
 if not found then raise exception 'not excerpt owner'; end if;
end $$;
revoke all on function public.list_article_excerpts(text) from public;
revoke all on function public.create_article_excerpt(text,text,text,text,text,uuid) from public;
revoke all on function public.delete_article_excerpt(uuid,uuid) from public;
grant execute on function public.list_article_excerpts(text) to anon,authenticated;
grant execute on function public.create_article_excerpt(text,text,text,text,text,uuid) to anon,authenticated;
grant execute on function public.delete_article_excerpt(uuid,uuid) to anon,authenticated;
commit;
