-- 2minutes V2.1.12 - increase excerpt limit to 600 chars
begin;

alter table public.tm_article_excerpts
  drop constraint if exists tm_article_excerpts_excerpt_check;

alter table public.tm_article_excerpts
  add constraint tm_article_excerpts_excerpt_check
  check (char_length(excerpt) between 12 and 600);

create or replace function public.create_article_excerpt(p_source_url text,p_source_title text,p_target_url text,p_target_title text,p_excerpt text,p_client_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare sa uuid;ta uuid;aa uuid;bb uuid;ln uuid;eid uuid; su text:=trim(p_source_url);tu text:=trim(p_target_url);ex text:=regexp_replace(trim(p_excerpt),'\s+',' ','g'); begin
 if su=tu then raise exception 'same article'; end if;
 if not tm_allowed(su) or not tm_allowed(tu) then raise exception 'unmanaged media'; end if;
 if char_length(ex)<12 or char_length(ex)>600 then raise exception 'invalid excerpt length'; end if;
 insert into tm_articles(canonical_url,domain,title) values(su,tm_domain(su),coalesce(nullif(trim(p_source_title),''),tm_domain(su))) on conflict(canonical_url) do update set title=excluded.title returning id into sa;
 insert into tm_articles(canonical_url,domain,title) values(tu,tm_domain(tu),coalesce(nullif(trim(p_target_title),''),tm_domain(tu))) on conflict(canonical_url) do update set title=excluded.title returning id into ta;
 aa:=least(sa,ta);bb:=greatest(sa,ta);
 insert into tm_article_links(article_a,article_b) values(aa,bb) on conflict(article_a,article_b) do update set article_a=excluded.article_a returning id into ln;
 insert into tm_article_excerpts(link_id,source_article,excerpt,created_by) values(ln,ta,ex,p_client_id) returning id into eid;
 return eid;
 exception when unique_violation then raise exception 'duplicate excerpt';
end $$;

revoke all on function public.create_article_excerpt(text,text,text,text,text,uuid) from public;
grant execute on function public.create_article_excerpt(text,text,text,text,text,uuid) to anon,authenticated;
commit;
