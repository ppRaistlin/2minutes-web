# Installation — import rédactionnel `.2min` — 2Minutes v1.0.43

## 1. Déploiement du site

1. Faites une sauvegarde de la V1.0.42 et des données Supabase.
2. Décompressez le ZIP **complet** de la V1.0.43 ; copiez son contenu à la racine du dépôt GitHub Pages `2minutes-web`, sur la branche actuellement publiée.
3. Le projet conserve le déploiement GitHub Pages existant ; les fichiers `sw.js`, `index.html`, `app.js`, `style.css`, `community-config.js` et les ressources BD ne doivent pas être supprimés.
4. Ouvrez le site, vérifiez **2Minutes v1.0.43**, puis utilisez Paramètres → Importation rédactionnelle.

## 2. Migration SQL (obligatoire avant import)

Dans Supabase → **SQL Editor** :

1. Vérifiez que les tables `tm_allowed_media`, `tm_articles`, `tm_article_links`, `tm_article_excerpts`, `tm_excerpt_votes` existent.
2. Vérifiez que la migration précédente a créé `tm_article_excerpts.origin` avec la valeur `editorial` disponible, et que `created_by` peut être NULL pour ces extraits.
3. Examinez puis exécutez **manuellement** `supabase-import-editorial-2min-v1.sql`. Elle crée la liste des comptes autorisés, la table d'analyses conservées, deux RPC privées et deux RPC publiques de lecture V4. Elle ne modifie aucune contribution existante à son installation.
4. Vérifiez les domaines du fichier d'exemple :

```sql
SELECT domain FROM public.tm_allowed_media
WHERE domain IN ('bfmtv.com', 'lcp.fr', 'rtl.fr')
ORDER BY domain;
```

Si un domaine manque, ne l'ajoutez qu'après vérification éditoriale et administrative. Le processus échoue volontairement sur les médias absents.

## 3. Compte et autorisation rédactionnelle

1. Dans Supabase → **Authentication → Users**, créez un compte rédaction dédié et vérifiez son e-mail (le fournisseur Email/Password doit être actif).
2. Copiez l'UUID réel du compte.
3. Exécutez dans SQL Editor **séparément**, en remplaçant la valeur d'exemple :

```sql
INSERT INTO public.tm_editorial_importers(user_id)
VALUES ('UUID_REEL_DU_COMPTE_REDACTION')
ON CONFLICT DO NOTHING;
```

`UUID_REEL_DU_COMPTE_REDACTION` doit être remplacé par un vrai UUID ; ne collez pas la commande telle quelle. Seuls les administrateurs Supabase peuvent modifier cette table. La visibilité du formulaire et les droits d'import sont vérifiés côté serveur.

La clé Supabase dans `community-config.js` est une **clé publique publishable**, jamais une clé `service_role`.

## 4. Première recette

1. Ouvrez Paramètres → Importation rédactionnelle et connectez-vous avec le compte autorisé.
2. Choisissez `samples/exemple-bfmtv.2min` (BFMTV, LCP, RTL).
3. Relisez les deux paires, l'auteur de chaque affirmation, le passage source/cible disponible et les preuves.
4. Cochez la confirmation explicite et cliquez sur **Confirmer l'importation**.
5. Vérifiez le bilan (articles créés/réutilisés ; liaisons créées/réutilisées ; extraits et analyses créés/réutilisés).
6. Réimportez le même fichier : le bilan doit indiquer les éléments réutilisés, sans nouveaux doublons.
7. Ouvrez les articles dans la Web/PWA ; les extraits d'origine rédactionnelle doivent porter la mention **« Sélectionné par la rédaction 2minutes »**.
8. Vérifiez ensuite les votes et le fonctionnement de l'extension Chrome sur une contribution communautaire existante.

La validation de ce fichier ne prouve pas que les citations ont été vérifiées auprès des éditeurs. Le contrôle humain préalable reste indispensable.

## 5. Compatibilité et retour arrière

- Le schéma existant de contributions et de votes n'est pas remplacé.
- Les fonctions `list_recent_articles_public_v3`, `list_article_views_v3` et les RPC d'écriture de l'extension Chrome restent disponibles. Le site préfère les V4 avec retour automatique aux anciennes versions si la migration de lecture n'a pas été exécutée.
- La fonction d'import est transactionnelle ; un échec entraîne un rollback de l'appel complet.
- Les analyses sont stockées dans `tm_editorial_analyses`, protégée par RLS et sans accès direct depuis `anon` ou `authenticated`.
- Pour retirer les droits d'un compte : `DELETE FROM public.tm_editorial_importers WHERE user_id='UUID_REEL';` (administrateur uniquement).
- Pour revenir au site V1.0.42, redéployez son ZIP ; laissez les tables et fonctions versionnées en place pour éviter toute perte de données. Il n'est pas nécessaire de supprimer les données d'import.

## 6. Limites des tests

Le validateur JavaScript et les parcours desktop/mobile ont été testés avec un Supabase **simulé**. La migration n'a **pas été appliquée** à la base de production dans cet environnement. Les tests d'atomicité, d'idempotence SQL, de permissions et de votes réels doivent être effectués dans votre environnement Supabase avant promotion stable.
