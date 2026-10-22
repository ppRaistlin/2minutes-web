-- Diagnostic 2minutes : lecture seule, aucune donnée modifiée.
-- À exécuter dans Supabase SQL Editor ; nécessite la migration image_url V2.1.37.
SELECT count(*) AS articles_total,
       count(*) FILTER (WHERE nullif(btrim(image_url),'') IS NOT NULL) AS articles_avec_image,
       count(*) FILTER (WHERE nullif(btrim(image_url),'') IS NULL) AS articles_sans_image
FROM public.tm_articles;

SELECT domain, title, canonical_url, image_url,
       CASE WHEN nullif(btrim(image_url),'') IS NULL THEN 'Aucune URL enregistrée'
            WHEN image_url !~* '^https?://' THEN 'URL non HTTP(S)'
            ELSE 'URL enregistrée (chargement navigateur à vérifier)' END AS diagnostic
FROM public.tm_articles
ORDER BY id DESC
LIMIT 50;

-- En cas d’URL absente : le frontend ne peut pas recréer la photo.
-- Vérifier que la migration V2.1.42 a été exécutée, puis ouvrir l’article
-- avec l’extension actualisée et ajouter une nouvelle contribution autorisée.
-- La V2.1.42 permet alors le remplissage d’image_url si une image est trouvée.
