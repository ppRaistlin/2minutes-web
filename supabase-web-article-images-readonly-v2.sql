-- 2minutes Web/PWA V1.0.18 — lecture seule. À exécuter MANUELLEMENT après
-- application des migrations extension V2.1.37 et V2.1.42.
-- Ne modifie aucune contribution, règle RLS ni fonction d’écriture.
-- Les RPC SECURITY DEFINER ne retournent que les métadonnées d’articles
-- déjà présents dans au moins un lien communautaire.
CREATE OR REPLACE FUNCTION public.list_recent_articles_public_v2(
 p_search text DEFAULT '', p_limit integer DEFAULT 50
) RETURNS TABLE(url text,title text,domain text,image_url text,last_linked_at timestamptz,linked_articles jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH candidates AS (
 SELECT a.id,a.canonical_url,a.title,a.domain,a.image_url,max(l.created_at) AS last_at
 FROM public.tm_articles a
 JOIN public.tm_article_links l ON l.article_a=a.id OR l.article_b=a.id
 WHERE length(trim(coalesce(p_search,'')))<2
    OR a.title ILIKE '%'||replace(replace(replace(left(trim(p_search),100),'\','\\'),'%','\%'),'_','\_')||'%' ESCAPE '\'
 GROUP BY a.id,a.canonical_url,a.title,a.domain,a.image_url
 ORDER BY max(l.created_at) DESC,a.id
 LIMIT least(greatest(coalesce(p_limit,50),1),50)
), pairs AS (
 SELECT c.id AS source_id,other.canonical_url AS other_url,other.title AS other_title,
 other.domain AS other_domain,other.image_url AS other_image_url,l.created_at,
 best.excerpt,best.upvotes,best.downvotes,best.score
 FROM candidates c
 JOIN public.tm_article_links l ON l.article_a=c.id OR l.article_b=c.id
 JOIN public.tm_articles other ON other.id=CASE WHEN l.article_a=c.id THEN l.article_b ELSE l.article_a END
 LEFT JOIN LATERAL (
  SELECT e.excerpt,count(v.*) FILTER(WHERE v.value=1)::integer AS upvotes,
   count(v.*) FILTER(WHERE v.value=-1)::integer AS downvotes,
   coalesce(sum(v.value),0)::integer AS score
  FROM public.tm_article_excerpts e
  LEFT JOIN public.tm_excerpt_votes v ON v.excerpt_id=e.id
  WHERE e.link_id=l.id AND e.source_article=other.id
  GROUP BY e.id,e.excerpt,e.created_at
  ORDER BY coalesce(sum(v.value),0) DESC,e.created_at DESC LIMIT 1
 ) best ON TRUE
), ranked AS (
 SELECT p.*,row_number() OVER(PARTITION BY p.source_id ORDER BY p.created_at DESC,p.other_url) AS rn
 FROM pairs p
)
SELECT c.canonical_url,c.title,c.domain,c.image_url,c.last_at,coalesce((
 SELECT jsonb_agg(jsonb_build_object('url',r.other_url,'title',r.other_title,
 'domain',r.other_domain,'image_url',r.other_image_url,'excerpt',r.excerpt,
 'upvotes',coalesce(r.upvotes,0),'downvotes',coalesce(r.downvotes,0)) ORDER BY r.created_at DESC,r.other_url)
 FROM ranked r WHERE r.source_id=c.id AND r.rn<=5
),'[]'::jsonb)
FROM candidates c ORDER BY c.last_at DESC,c.id;
$$;
REVOKE ALL ON FUNCTION public.list_recent_articles_public_v2(text,integer) FROM public;
GRANT EXECUTE ON FUNCTION public.list_recent_articles_public_v2(text,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_public_article_metadata_v1(p_url text)
RETURNS TABLE(url text,title text,domain text,image_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT a.canonical_url,a.title,a.domain,a.image_url
 FROM public.tm_articles a
 WHERE a.canonical_url=p_url
   AND EXISTS (SELECT 1 FROM public.tm_article_links l WHERE l.article_a=a.id OR l.article_b=a.id)
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_article_metadata_v1(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_article_metadata_v1(text) TO anon,authenticated;
