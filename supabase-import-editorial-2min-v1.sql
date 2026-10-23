-- 2Minutes Web/PWA V1.0.43 — .2min editorial importer (MANUAL migration)
-- Prerequisites: tm_articles, tm_article_links, tm_article_excerpts, tm_excerpt_votes,
-- tm_allowed_media, and tm_article_excerpts.origin ('community' / 'editorial')
-- with nullable tm_article_excerpts.created_by for editorial records.
-- Do not run without reviewing and backing up the schema.
-- The entire migration is atomic. No data is imported during installation.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_attribute
    WHERE attrelid='public.tm_article_excerpts'::regclass
      AND attname='origin' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Precondition missing: tm_article_excerpts.origin. Install the editorial origin migration first.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute
    WHERE attrelid='public.tm_article_excerpts'::regclass
      AND attname='created_by' AND attnotnull AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Precondition missing: created_by must permit NULL for editorial excerpts.';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.tm_editorial_importers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tm_editorial_importers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tm_editorial_importers FROM PUBLIC, anon, authenticated;

-- Preserve the context of each accepted pair, without changing existing community records.
CREATE TABLE IF NOT EXISTS public.tm_editorial_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excerpt_id uuid NOT NULL UNIQUE REFERENCES public.tm_article_excerpts(id) ON DELETE CASCADE,
  reference_article_id uuid NOT NULL REFERENCES public.tm_articles(id) ON DELETE CASCADE,
  target_article_id uuid NOT NULL REFERENCES public.tm_articles(id) ON DELETE CASCADE,
  reference_claim jsonb NOT NULL,
  counter_claim jsonb NOT NULL,
  explanation text NOT NULL,
  contradiction_type text NOT NULL DEFAULT '',
  evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_language text NOT NULL,
  format_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tm_editorial_evidence_is_array CHECK (jsonb_typeof(evidence_urls)='array')
);
ALTER TABLE public.tm_editorial_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tm_editorial_analyses FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tm_editorial_can_import_v1()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tm_editorial_importers WHERE user_id=auth.uid()
  );
$fn$;
REVOKE ALL ON FUNCTION public.tm_editorial_can_import_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_editorial_can_import_v1() TO authenticated;

CREATE OR REPLACE FUNCTION public.tm_import_editorial_2min_v2(p_document jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_user uuid;
  v_ref jsonb;
  v_pair jsonb;
  v_target jsonb;
  v_ref_url text;
  v_target_url text;
  v_ref_id uuid;
  v_target_id uuid;
  v_link_id uuid;
  v_excerpt_id uuid;
  v_analysis_id uuid;
  v_excerpt text;
  v_host text;
  v_title text;
  v_n integer;
  v_pair_count integer;
  v_lang text;
  v_claim jsonb;
  v_counter jsonb;
  v_explanation text;
  v_evidence jsonb;
  v_seen text[] := ARRAY[]::text[];
  v_articles_created integer:=0;
  v_articles_reused integer:=0;
  v_links_created integer:=0;
  v_links_reused integer:=0;
  v_excerpts_created integer:=0;
  v_excerpts_reused integer:=0;
  v_analyses_created integer:=0;
  v_analyses_reused integer:=0;
BEGIN
  v_user:=auth.uid();
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tm_editorial_importers WHERE user_id=v_user
  ) THEN
    RAISE EXCEPTION 'Compte non autorisé à importer des contributions rédactionnelles'
      USING ERRCODE='42501';
  END IF;

  -- Serialise editorial imports to make duplicate counts predictable on concurrent re-imports.
  PERFORM pg_catalog.pg_advisory_xact_lock(718244, 240143);
  IF p_document IS NULL OR pg_catalog.jsonb_typeof(p_document)<>'object'
     OR pg_catalog.length(p_document::text)>204800
     OR p_document->>'format' IS DISTINCT FROM '2minutes-article-confrontation'
     OR p_document->>'format_version' IS DISTINCT FROM '0.1-draft'
     OR p_document->>'status' IS DISTINCT FROM 'user_approved'
     OR pg_catalog.jsonb_typeof(p_document->'pairs')<>'array'
     OR pg_catalog.jsonb_typeof(p_document->'reference_article')<>'object'
  THEN RAISE EXCEPTION 'Fichier .2min invalide ou version non prise en charge' USING ERRCODE='22023'; END IF;
  v_pair_count:=pg_catalog.jsonb_array_length(p_document->'pairs');
  IF v_pair_count NOT BETWEEN 1 AND 25 THEN
    RAISE EXCEPTION 'Le fichier doit contenir entre 1 et 25 paires' USING ERRCODE='22023';
  END IF;
  v_lang:=coalesce(p_document->>'search_language',p_document->>'language','');
  IF v_lang !~ '^[a-z]{2}(-[A-Za-z]{2})?$' THEN
    RAISE EXCEPTION 'Langue de recherche invalide' USING ERRCODE='22023';
  END IF;
  v_ref:=p_document->'reference_article';
  v_ref_url:=v_ref->>'url';
  v_title:=pg_catalog.btrim(v_ref->>'title');
  IF v_ref_url IS NULL OR pg_catalog.length(v_ref_url)>4000
     OR v_ref_url !~ '^https?://[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(/[^[:space:]#\\]*)?$'
     OR v_ref_url ~ '[#@]' OR v_ref_url ~* '[?&](utm_[a-z_]+|gclid|fbclid)='
     OR v_ref_url LIKE '%://www.%' OR coalesce(pg_catalog.length(v_title),0) NOT BETWEEN 1 AND 500
  THEN RAISE EXCEPTION 'URL ou titre de référence invalide' USING ERRCODE='22023'; END IF;
  v_host:=pg_catalog.lower(pg_catalog.split_part(pg_catalog.split_part(v_ref_url,'://',2),'/',1));
  IF NOT EXISTS (SELECT 1 FROM public.tm_allowed_media WHERE domain=v_host) THEN
    RAISE EXCEPTION 'Média de référence non autorisé : %',v_host USING ERRCODE='22023';
  END IF;

  INSERT INTO public.tm_articles(canonical_url,domain,title)
    VALUES(v_ref_url,v_host,v_title)
    ON CONFLICT(canonical_url) DO NOTHING RETURNING id INTO v_ref_id;
  IF v_ref_id IS NULL THEN
    SELECT id INTO STRICT v_ref_id FROM public.tm_articles WHERE canonical_url=v_ref_url;
    v_articles_reused:=v_articles_reused+1;
  ELSE v_articles_created:=v_articles_created+1; END IF;

  FOR v_pair IN SELECT value FROM pg_catalog.jsonb_array_elements(p_document->'pairs') LOOP
    IF pg_catalog.jsonb_typeof(v_pair)<>'object' OR v_pair->>'approval' IS DISTINCT FROM 'accepted'
       OR pg_catalog.jsonb_typeof(v_pair->'target_article')<>'object' THEN
      RAISE EXCEPTION 'Paire non acceptée ou invalide' USING ERRCODE='22023';
    END IF;
    v_target:=v_pair->'target_article';
    v_target_url:=v_target->>'url';
    v_title:=pg_catalog.btrim(v_target->>'title');
    v_excerpt:=pg_catalog.regexp_replace(pg_catalog.btrim(v_pair->>'target_excerpt'),'\s+',' ','g');
    v_claim:=v_pair->'reference_claim';
    v_counter:=v_pair->'counter_claim';
    v_explanation:=pg_catalog.btrim(v_pair->>'explanation');
    v_evidence:=v_pair->'evidence_urls';

    IF v_target_url IS NULL OR pg_catalog.length(v_target_url)>4000
      OR v_target_url !~ '^https?://[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(/[^[:space:]#\\]*)?$'
      OR v_target_url ~ '[#@]' OR v_target_url ~* '[?&](utm_[a-z_]+|gclid|fbclid)='
      OR v_target_url LIKE '%://www.%'
      OR v_target_url=v_ref_url OR v_target_url=ANY(v_seen)
      OR coalesce(pg_catalog.length(v_title),0) NOT BETWEEN 1 AND 500
      OR coalesce(pg_catalog.char_length(v_excerpt),0) NOT BETWEEN 12 AND 600
      OR coalesce(pg_catalog.jsonb_typeof(v_claim),'')<>'object'
      OR coalesce(pg_catalog.jsonb_typeof(v_counter),'')<>'object'
      OR coalesce(pg_catalog.length(pg_catalog.btrim(v_claim->>'text')),0) NOT BETWEEN 1 AND 3000
      OR coalesce(pg_catalog.length(pg_catalog.btrim(v_claim->>'attribution')),0) NOT BETWEEN 1 AND 500
      OR coalesce(pg_catalog.length(pg_catalog.btrim(v_counter->>'text')),0) NOT BETWEEN 1 AND 3000
      OR coalesce(pg_catalog.length(pg_catalog.btrim(v_counter->>'attribution')),0) NOT BETWEEN 1 AND 500
      OR coalesce(pg_catalog.length(v_explanation),0) NOT BETWEEN 1 AND 5000
      OR pg_catalog.length(coalesce(v_pair->>'contradiction_type',''))>120
      OR coalesce(pg_catalog.jsonb_typeof(v_evidence),'')<>'array'
    THEN RAISE EXCEPTION 'Paire invalide : titre, extrait, analyse ou URL incorrect' USING ERRCODE='22023'; END IF;
    v_n:=pg_catalog.jsonb_array_length(v_evidence);
    IF v_n<2 OR v_n>12 OR EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_array_elements_text(v_evidence) AS ev(u)
      WHERE ev.u IS NULL OR pg_catalog.length(ev.u)>4000
        OR ev.u !~ '^https?://[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(/[^[:space:]#\\]*)?$'
    ) OR NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements_text(v_evidence) AS ev(u)
      WHERE ev.u=v_ref_url)
      OR NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements_text(v_evidence) AS ev(u)
      WHERE ev.u=v_target_url)
    THEN RAISE EXCEPTION 'Références de preuve invalides : chaque paire doit référencer les deux articles' USING ERRCODE='22023'; END IF;

    v_seen:=pg_catalog.array_append(v_seen,v_target_url);
    v_host:=pg_catalog.lower(pg_catalog.split_part(pg_catalog.split_part(v_target_url,'://',2),'/',1));
    IF NOT EXISTS (SELECT 1 FROM public.tm_allowed_media WHERE domain=v_host) THEN
      RAISE EXCEPTION 'Média lié non autorisé : %',v_host USING ERRCODE='22023';
    END IF;

    v_target_id:=NULL;
    INSERT INTO public.tm_articles(canonical_url,domain,title)
      VALUES(v_target_url,v_host,v_title)
      ON CONFLICT(canonical_url) DO NOTHING RETURNING id INTO v_target_id;
    IF v_target_id IS NULL THEN
      SELECT id INTO STRICT v_target_id FROM public.tm_articles WHERE canonical_url=v_target_url;
      v_articles_reused:=v_articles_reused+1;
    ELSE v_articles_created:=v_articles_created+1; END IF;

    v_link_id:=NULL;
    INSERT INTO public.tm_article_links(article_a,article_b)
      VALUES(LEAST(v_ref_id,v_target_id),GREATEST(v_ref_id,v_target_id))
      ON CONFLICT(article_a,article_b) DO NOTHING RETURNING id INTO v_link_id;
    IF v_link_id IS NULL THEN
      SELECT id INTO STRICT v_link_id FROM public.tm_article_links
        WHERE article_a=LEAST(v_ref_id,v_target_id)
          AND article_b=GREATEST(v_ref_id,v_target_id);
      v_links_reused:=v_links_reused+1;
    ELSE v_links_created:=v_links_created+1; END IF;

    v_excerpt_id:=NULL;
    INSERT INTO public.tm_article_excerpts(link_id,source_article,excerpt,origin,created_by)
      VALUES(v_link_id,v_target_id,v_excerpt,'editorial',NULL)
      ON CONFLICT DO NOTHING RETURNING id INTO v_excerpt_id;
    IF v_excerpt_id IS NULL THEN
      -- The legacy unique index is per-link, not per-direction. Refuse to
      -- attribute a source-article excerpt to the wrong target article.
      SELECT id INTO v_excerpt_id FROM public.tm_article_excerpts
      WHERE link_id=v_link_id AND source_article=v_target_id
        AND pg_catalog.md5(pg_catalog.lower(pg_catalog.regexp_replace(excerpt,'\s+',' ','g')))
          =pg_catalog.md5(pg_catalog.lower(pg_catalog.regexp_replace(v_excerpt,'\s+',' ','g')))
      LIMIT 1;
      IF v_excerpt_id IS NULL THEN
        RAISE EXCEPTION 'Un extrait identique existe déjà pour cette liaison, mais appartient à l’autre article' USING ERRCODE='22023';
      END IF;
      v_excerpts_reused:=v_excerpts_reused+1;
    ELSE v_excerpts_created:=v_excerpts_created+1; END IF;

    v_analysis_id:=NULL;
    INSERT INTO public.tm_editorial_analyses(
      excerpt_id,reference_article_id,target_article_id,reference_claim,
      counter_claim,explanation,contradiction_type,evidence_urls,search_language,format_version
    ) VALUES (
      v_excerpt_id,v_ref_id,v_target_id,v_claim,v_counter,v_explanation,
      coalesce(v_pair->>'contradiction_type',''),v_evidence,v_lang,'0.1-draft'
    ) ON CONFLICT(excerpt_id) DO NOTHING RETURNING id INTO v_analysis_id;
    IF v_analysis_id IS NULL THEN v_analyses_reused:=v_analyses_reused+1;
    ELSE v_analyses_created:=v_analyses_created+1; END IF;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object(
    'articles_created',v_articles_created,'articles_reused',v_articles_reused,
    'links_created',v_links_created,'links_reused',v_links_reused,
    'excerpts_created',v_excerpts_created,'excerpts_reused',v_excerpts_reused,
    'analyses_created',v_analyses_created,'analyses_reused',v_analyses_reused,
    'pairs_total',v_pair_count
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.tm_import_editorial_2min_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_import_editorial_2min_v2(jsonb) TO authenticated;

-- Versioned reading RPC: does not modify the installed V3 or community APIs.
CREATE OR REPLACE FUNCTION public.list_recent_articles_public_v4(
 p_search text DEFAULT '', p_limit integer DEFAULT 50
) RETURNS TABLE(url text,title text,domain text,image_url text,last_linked_at timestamptz,linked_articles jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
WITH candidates AS (
 SELECT a.id,a.canonical_url,a.title,a.domain,a.image_url,max(l.created_at) AS last_at
 FROM public.tm_articles a
 JOIN public.tm_article_links l ON l.article_a=a.id OR l.article_b=a.id
 WHERE pg_catalog.length(pg_catalog.btrim(coalesce(p_search,'')))<2
    OR a.title ILIKE '%'||replace(replace(replace(left(pg_catalog.btrim(p_search),100),'\','\\'),'%','\%'),'_','\_')||'%' ESCAPE '\'
 GROUP BY a.id,a.canonical_url,a.title,a.domain,a.image_url
 ORDER BY max(l.created_at) DESC,a.id
 LIMIT LEAST(GREATEST(coalesce(p_limit,50),1),50)
), pairs AS (
 SELECT c.id AS source_id,other.canonical_url AS other_url,other.title AS other_title,
 other.domain AS other_domain,other.image_url AS other_image_url,l.created_at,
 best.excerpt,best.origin AS excerpt_origin,best.upvotes,best.downvotes,best.score,
 source_best.excerpt AS source_excerpt,source_best.origin AS source_origin
 FROM candidates c
 JOIN public.tm_article_links l ON l.article_a=c.id OR l.article_b=c.id
 JOIN public.tm_articles other ON other.id=CASE WHEN l.article_a=c.id THEN l.article_b ELSE l.article_a END
 LEFT JOIN LATERAL (
  SELECT e.excerpt,e.origin,count(v.*) FILTER(WHERE v.value=1)::integer AS upvotes,
   count(v.*) FILTER(WHERE v.value=-1)::integer AS downvotes,
   coalesce(sum(v.value),0)::integer AS score
  FROM public.tm_article_excerpts e
  LEFT JOIN public.tm_excerpt_votes v ON v.excerpt_id=e.id
  WHERE e.link_id=l.id AND e.source_article=other.id
  GROUP BY e.id,e.excerpt,e.origin,e.created_at
  ORDER BY coalesce(sum(v.value),0) DESC,e.created_at DESC LIMIT 1
 ) best ON TRUE
 LEFT JOIN LATERAL (
  SELECT e.excerpt,e.origin
  FROM public.tm_article_excerpts e
  LEFT JOIN public.tm_excerpt_votes v ON v.excerpt_id=e.id
  WHERE e.link_id=l.id AND e.source_article=c.id
  GROUP BY e.id,e.excerpt,e.origin,e.created_at
  ORDER BY coalesce(sum(v.value),0) DESC,e.created_at DESC,e.id DESC LIMIT 1
 ) source_best ON TRUE
), ranked AS (
 SELECT p.*,row_number() OVER(PARTITION BY p.source_id ORDER BY p.created_at DESC,p.other_url) AS rn
 FROM pairs p
)
SELECT c.canonical_url,c.title,c.domain,c.image_url,c.last_at,coalesce((
 SELECT jsonb_agg(jsonb_build_object('url',r.other_url,'title',r.other_title,
 'domain',r.other_domain,'image_url',r.other_image_url,'excerpt',r.excerpt,
 'excerpt_origin',r.excerpt_origin,'source_excerpt',r.source_excerpt,'source_origin',r.source_origin,
 'upvotes',coalesce(r.upvotes,0),'downvotes',coalesce(r.downvotes,0)) ORDER BY r.created_at DESC,r.other_url)
 FROM ranked r WHERE r.source_id=c.id AND r.rn<=5
),'[]'::jsonb)
FROM candidates c ORDER BY c.last_at DESC,c.id;
$fn$;
REVOKE ALL ON FUNCTION public.list_recent_articles_public_v4(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_recent_articles_public_v4(text,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.list_article_views_web_v4(p_page_url text)
RETURNS TABLE(id uuid,other_url text,other_title text,other_domain text,other_image_url text,
 excerpt text,score bigint,upvotes bigint,downvotes bigint,confirmed boolean,
 created_at timestamptz,created_by uuid,origin text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
WITH me AS (SELECT id FROM public.tm_articles WHERE canonical_url=p_page_url LIMIT 1),
links AS (
 SELECT l.id AS link_id,
 CASE WHEN l.article_a=(SELECT id FROM me) THEN b.id ELSE a.id END AS other_id,
 CASE WHEN l.article_a=(SELECT id FROM me) THEN b.canonical_url ELSE a.canonical_url END AS other_url,
 CASE WHEN l.article_a=(SELECT id FROM me) THEN b.title ELSE a.title END AS other_title,
 CASE WHEN l.article_a=(SELECT id FROM me) THEN b.domain ELSE a.domain END AS other_domain,
 CASE WHEN l.article_a=(SELECT id FROM me) THEN b.image_url ELSE a.image_url END AS other_image_url,
 l.created_at AS link_created_at
 FROM public.tm_article_links l
 JOIN public.tm_articles a ON a.id=l.article_a
 JOIN public.tm_articles b ON b.id=l.article_b
 WHERE l.article_a=(SELECT id FROM me) OR l.article_b=(SELECT id FROM me)
), votes AS (
 SELECT excerpt_id,count(*) FILTER(WHERE value=1)::bigint AS up,
 count(*) FILTER(WHERE value=-1)::bigint AS down,coalesce(sum(value),0)::bigint AS score
 FROM public.tm_excerpt_votes GROUP BY excerpt_id
)
SELECT e.id,l.other_url,l.other_title,l.other_domain,l.other_image_url,e.excerpt,
 coalesce(v.score,0)::bigint,coalesce(v.up,0)::bigint,coalesce(v.down,0)::bigint,
 (coalesce(v.score,0)>=3),coalesce(e.created_at,l.link_created_at),e.created_by,e.origin
FROM links l LEFT JOIN public.tm_article_excerpts e ON e.link_id=l.link_id AND e.source_article=l.other_id
LEFT JOIN votes v ON v.excerpt_id=e.id
ORDER BY l.other_url,coalesce(v.score,0) DESC,e.created_at DESC NULLS LAST;
$fn$;
REVOKE ALL ON FUNCTION public.list_article_views_web_v4(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_article_views_web_v4(text) TO anon,authenticated;
COMMIT;

-- Authorise an editorial user only after creating/verifying their Supabase Auth account.
-- Run separately, with a REAL UUID returned by Authentication > Users:
-- INSERT INTO public.tm_editorial_importers(user_id)
-- VALUES ('00000000-0000-0000-0000-000000000000') ON CONFLICT DO NOTHING;
-- Do not use the zero UUID above; it is a placeholder.
