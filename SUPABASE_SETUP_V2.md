# 2minutes V2.1 — activation du backend communautaire

1. Dans Supabase > SQL Editor, exécuter `supabase-v2-community.sql`.
2. Dans Project Settings / API, récupérer uniquement :
   - Project URL
   - Publishable key (ou anon public key)
3. Les copier dans `community-config.js`.
4. Ne jamais mettre `service_role`, secret key ou mot de passe de base dans l’extension.
5. Recharger l’extension dans Chrome.

Le script utilise des tables préfixées `tm_` afin de ne pas entrer en conflit avec l’ancien prototype Supabase déjà créé.

Sécurité MVP : les tables sont en RLS et non accessibles directement à anon/authenticated ; seules les fonctions RPC prévues sont exécutables. L’identité de vote est un UUID local par installation Chrome (anti-doublon fonctionnel, pas une identité forte). Une authentification anonyme Supabase pourra renforcer ce point ultérieurement.


## V2.1.3
For an existing V2.1.x database, run `supabase-v2.1.3-migration.sql` once in SQL Editor before testing deletion/300-character excerpts.


## Migration V2.1.12
Run `supabase-v2.1.12-migration.sql` once to raise the excerpt limit from 300 to 600 characters.


## V2.1.23
Exécuter `supabase-v2.1.23-directional-excerpts.sql` pour rendre les extraits directionnels : une liaison A↔B reste bidirectionnelle, mais un passage n'est affiché que depuis l'article opposé dont il provient.


## V2.1.24
Run `supabase-v2.1.24-directional-rpc-v2.sql` once. The extension now calls new RPC names so old cached/legacy directional functions cannot leak reverse excerpts.


## V2.1.37 — images d’articles
Exécuter `supabase-v2.1.37-article-images.sql` une fois dans le SQL Editor Supabase. Cette migration ajoute `tm_articles.image_url` et les RPC `list_article_views_v3` / `create_article_excerpt_v3`.


## V2.1.39 — images stables par article
Exécuter `supabase-v2.1.39-stable-article-images.sql` après V2.1.37. Cette migration empêche une nouvelle citation de remplacer l’image déjà associée à un article.

### V2.1.42 — validation des URLs d’image
Exécuter `supabase-v2.1.42-image-url-validation.sql` après V2.1.39. Cette migration nettoie les `image_url` qui pointent vers l’article lui-même (y compris variante `www`) et permet de les remplacer par la vraie image lors d’une nouvelle liaison/citation.
