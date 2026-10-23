-- 2minutes V2.1.39 — images stables par article
-- Chaque article conserve sa propre image. Une nouvelle citation ne remplace jamais
-- une image déjà enregistrée pour cet article.

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


revoke all on function public.create_article_excerpt_v3(text,text,text,text,text,text,text,uuid) from public;
grant execute on function public.create_article_excerpt_v3(text,text,text,text,text,text,text,uuid) to anon,authenticated;
