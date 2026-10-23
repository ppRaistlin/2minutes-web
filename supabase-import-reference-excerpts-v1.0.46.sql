-- Migration additive V1.0.46 : passage de référence facultatif dans .2min
-- À exécuter manuellement après sauvegarde et vérification sur une base de test.
-- Aucune modification des données existantes.
BEGIN;
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
  v_reference_excerpt text;
  v_reference_excerpt_id uuid;
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
    v_reference_excerpt:=NULL;
    IF v_pair ? 'reference_excerpt' AND v_pair->>'reference_excerpt' IS NOT NULL THEN
      v_reference_excerpt:=pg_catalog.regexp_replace(pg_catalog.btrim(v_pair->>'reference_excerpt'),'\s+',' ','g');
      IF pg_catalog.char_length(v_reference_excerpt) NOT BETWEEN 12 AND 600 THEN
        RAISE EXCEPTION 'Passage de référence invalide : 12 à 600 caractères attendus' USING ERRCODE='22023';
      END IF;
    END IF;
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

    -- Deux passages indépendants, un pour chaque article de la liaison.
    -- L'ancien format sans reference_excerpt reste pris en charge.
    IF v_reference_excerpt IS NOT NULL THEN
      v_reference_excerpt_id:=NULL;
      INSERT INTO public.tm_article_excerpts(link_id,source_article,excerpt,origin,created_by)
      VALUES(v_link_id,v_ref_id,v_reference_excerpt,'editorial',NULL)
      ON CONFLICT DO NOTHING RETURNING id INTO v_reference_excerpt_id;
      IF v_reference_excerpt_id IS NULL THEN
        SELECT id INTO v_reference_excerpt_id FROM public.tm_article_excerpts
        WHERE link_id=v_link_id AND source_article=v_ref_id
          AND pg_catalog.md5(pg_catalog.lower(pg_catalog.regexp_replace(excerpt,'\s+',' ','g')))
            =pg_catalog.md5(pg_catalog.lower(pg_catalog.regexp_replace(v_reference_excerpt,'\s+',' ','g')))
        LIMIT 1;
        IF v_reference_excerpt_id IS NULL THEN
          RAISE EXCEPTION 'Conflit de passage de référence pour cette liaison' USING ERRCODE='22023';
        END IF;
        v_excerpts_reused:=v_excerpts_reused+1;
      ELSE
        v_excerpts_created:=v_excerpts_created+1;
      END IF;
    END IF;

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
COMMIT;
