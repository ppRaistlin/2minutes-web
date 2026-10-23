-- 2minutes workflow V2: migration facultative, NE PAS appliquer sans validation.
-- N'ajoute aucune table et ne modifie ni les fonctions de l'extension V2.1.42 ni les extraits existants.
-- Publication atomique dans une transaction Postgres unique.
create or replace function public.create_article_link_with_excerpts_v1(
  p_source_url text,
  p_source_title text,
  p_source_image_url text,
  p_target_url text,
  p_target_title text,
  p_target_image_url text,
  p_source_excerpt text,
  p_target_excerpt text,
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
  ex text:=regexp_replace(trim(p_target_excerpt),'\s+',' ','g');
  src_ex text:=regexp_replace(trim(coalesce(p_source_excerpt,'')),'\s+',' ','g');
  si text:=nullif(left(trim(coalesce(p_source_image_url,'')),4000),'');
  ti text:=nullif(left(trim(coalesce(p_target_image_url,'')),4000),'');
  su_cmp text;
  tu_cmp text;
  si_cmp text;
  ti_cmp text;
begin
  if su=tu then raise exception 'same article'; end if;
  if not tm_allowed(su) or not tm_allowed(tu) then raise exception 'unmanaged media'; end if;
  if char_length(ex)<12 or char_length(ex)>600 then raise exception 'invalid target excerpt length'; end if;
  if src_ex<>'' and (char_length(src_ex)<12 or char_length(src_ex)>600) then raise exception 'invalid source excerpt length'; end if;

  su_cmp := lower(regexp_replace(regexp_replace(split_part(split_part(su,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$',''));
  tu_cmp := lower(regexp_replace(regexp_replace(split_part(split_part(tu,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$',''));
  si_cmp := case when si is null then null else lower(regexp_replace(regexp_replace(split_part(split_part(si,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$','')) end;
  ti_cmp := case when ti is null then null else lower(regexp_replace(regexp_replace(split_part(split_part(ti,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$','')) end;

  -- Une URL d'article n'est jamais une image.
  if si_cmp = su_cmp then si := null; end if;
  if ti_cmp = tu_cmp then ti := null; end if;

  insert into tm_articles(canonical_url,domain,title,image_url)
  values(su,tm_domain(su),left(coalesce(p_source_title,''),500),si)
  on conflict(canonical_url) do update
    set title=case when excluded.title<>'' then excluded.title else tm_articles.title end,
        image_url=case
          when tm_articles.image_url is null or trim(tm_articles.image_url)='' then excluded.image_url
          when lower(regexp_replace(regexp_replace(split_part(split_part(tm_articles.image_url,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$',''))
             = lower(regexp_replace(regexp_replace(split_part(split_part(tm_articles.canonical_url,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$',''))
            then excluded.image_url
          else tm_articles.image_url
        end
  returning id into sa;

  insert into tm_articles(canonical_url,domain,title,image_url)
  values(tu,tm_domain(tu),left(coalesce(p_target_title,''),500),ti)
  on conflict(canonical_url) do update
    set title=case when excluded.title<>'' then excluded.title else tm_articles.title end,
        image_url=case
          when tm_articles.image_url is null or trim(tm_articles.image_url)='' then excluded.image_url
          when lower(regexp_replace(regexp_replace(split_part(split_part(tm_articles.image_url,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$',''))
             = lower(regexp_replace(regexp_replace(split_part(split_part(tm_articles.canonical_url,'#',1),'?',1),'^https?://(www\.)?','','i'),'/$',''))
            then excluded.image_url
          else tm_articles.image_url
        end
  returning id into ta;

  if su<tu then aa:=sa;bb:=ta;else aa:=ta;bb:=sa;end if;
  insert into tm_article_links(article_a,article_b)
  values(aa,bb)
  on conflict(article_a,article_b) do update set article_a=excluded.article_a
  returning id into ln;

  insert into tm_article_excerpts(link_id,source_article,excerpt,created_by)
  values(ln,ta,ex,p_client_id)
  returning id into eid;

  if src_ex<>'' then
    insert into tm_article_excerpts(link_id,source_article,excerpt,created_by)
    values(ln,sa,src_ex,p_client_id);
  end if;
  return eid;
exception
  when unique_violation then raise exception 'duplicate excerpt';
end $$;


revoke all on function public.create_article_link_with_excerpts_v1(text,text,text,text,text,text,text,text,uuid) from public;
grant execute on function public.create_article_link_with_excerpts_v1(text,text,text,text,text,text,text,text,uuid) to anon,authenticated;
