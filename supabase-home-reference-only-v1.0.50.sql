-- V1.0.50 : publication de la liste des articles de référence uniquement.
-- Préserver V4 pour les extensions / clients anciens.
-- La direction rédactionnelle est définie par tm_editorial_analyses.
-- Les relations communautaires historiques sans analyse utilisent article_a
-- et les extraits de source comme indices de direction (heuristique legacy).
-- IMPORTANT : sauvegarder et tester sur staging avant exécution en production.
BEGIN;
CREATE OR REPLACE FUNCTION public.list_recent_articles_public_v5(
 p_search text DEFAULT '', p_limit integer DEFAULT 50
) RETURNS TABLE(url text,title text,domain text,image_url text,last_linked_at timestamptz,linked_articles jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
WITH candidates AS (
 SELECT a.id,a.canonical_url,a.title,a.domain,a.image_url,max(l.created_at) AS last_at
 FROM public.tm_articles a
 JOIN public.tm_article_links l ON l.article_a=a.id OR l.article_b=a.id
 WHERE (
   EXISTS (SELECT 1 FROM public.tm_editorial_analyses ea WHERE ea.reference_article_id=a.id AND ea.target_article_id=CASE WHEN l.article_a=a.id THEN l.article_b ELSE l.article_a END)
   OR (NOT EXISTS (SELECT 1 FROM public.tm_editorial_analyses ea WHERE ea.reference_article_id IN (l.article_a,l.article_b) AND ea.target_article_id IN (l.article_a,l.article_b))
       AND (l.article_a=a.id OR EXISTS (SELECT 1 FROM public.tm_article_excerpts e WHERE e.link_id=l.id AND e.source_article=a.id)))
 )
 AND (
 pg_catalog.length(pg_catalog.btrim(coalesce(p_search,'')))<2
    OR a.title ILIKE '%'||replace(replace(replace(left(pg_catalog.btrim(p_search),100),'\','\\'),'%','\%'),'_','\_')||'%' ESCAPE '\')
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
 WHERE (
   EXISTS (SELECT 1 FROM public.tm_editorial_analyses ea WHERE ea.reference_article_id=c.id AND ea.target_article_id=other.id)
   OR (NOT EXISTS (SELECT 1 FROM public.tm_editorial_analyses ea WHERE ea.reference_article_id IN (l.article_a,l.article_b) AND ea.target_article_id IN (l.article_a,l.article_b))
       AND (l.article_a=c.id OR EXISTS (SELECT 1 FROM public.tm_article_excerpts e WHERE e.link_id=l.id AND e.source_article=c.id)))
 )
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
REVOKE ALL ON FUNCTION public.list_recent_articles_public_v5(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_recent_articles_public_v5(text,integer) TO anon,authenticated;
COMMIT;
