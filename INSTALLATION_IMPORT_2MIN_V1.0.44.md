# 2Minutes Web/PWA V1.0.44 — dépôt .2min sans connexion

## Différence essentielle : dépôt et publication

- **Dépôt sans compte** : le visiteur sélectionne un `.2min` sur l'accueil. Le navigateur valide sa structure, montre les deux paires, attend une confirmation, puis chiffre le JSON **avant transmission**.
- **Traitement côté Supabase** : une fonction Edge déchiffre et vérifie l'intégrité SHA-256 / AES-GCM, contrôle les médias via SQL, dédoublonne et range la proposition dans `tm_editorial_submissions` avec le statut `pending`.
- **Publication** : rien n'est créé dans `tm_articles`, `tm_article_links` ou `tm_article_excerpts` avant examen. Un compte rédactionnel habilité confirme l'import depuis Paramètres → Revue des dépôts. Cet appel réutilise la transaction éditoriale de V1.0.43.

Cette séparation est indispensable : un chiffrement à clé publique n'identifie **pas** l'auteur du fichier. Chacun peut utiliser une clé publique pour chiffrer un contenu. Pour un dépôt anonyme, la vérification humaine avant publication reste donc nécessaire.

## Étape 1 — Sauvegarder et publier le site

1. Sauvegarder la branche GitHub Pages et la base Supabase.
2. Extraire le ZIP complet V1.0.44 dans la branche `main` du dépôt `2minutes-web` ; **ne jamais inclure la clé privée dans GitHub**.
3. Vérifier que `import-public-key.pem` est bien livré. C'est une **clé publique** ; elle peut être distribuée avec le site.
4. Les autres modules (BD, articles, favoris, filtres, PWA, votes) sont inchangés.

## Étape 2 — Prérequis Supabase

Il faut avoir déjà installé `supabase-import-editorial-2min-v1.sql` de la V1.0.43. Si ce n'est pas fait, le revoir et l'appliquer manuellement dans Supabase SQL Editor avant la nouvelle migration. Il introduit `tm_editorial_importers`, `tm_editorial_analyses` et `tm_import_editorial_2min_v2`.

Vérifier que les domaines du fichier BFMTV sont autorisés :

```sql
SELECT domain FROM public.tm_allowed_media
WHERE domain IN ('bfmtv.com','lcp.fr','rtl.fr');
```

Dans Supabase → SQL Editor, **après relecture**, exécuter `supabase-anonymous-2min-review-v1.sql` (inclus dans le ZIP). Il crée une **file privée**, des RPC service_role/authenticated distinctes et aucune publication automatique.

## Étape 3 — Configurer la fonction Edge

1. Dans Supabase → Edge Functions, créer `submit-2min` et y déployer le contenu de `supabase/functions/submit-2min/index.ts`, ou utiliser Supabase CLI :

```sh
supabase functions deploy submit-2min --no-verify-jwt
```

2. Récupérer **à part** le fichier privé `2minutes-private-deployment-secrets.env` fourni avec la livraison. **Ne pas le placer dans le dépôt ni le joindre au ZIP public**.
3. Configurer les secrets `IMPORT_RSA_PRIVATE_KEY_B64` et `IMPORT_IP_HASH_SALT` de ce fichier dans Supabase → Edge Functions → Secrets (ou via `supabase secrets set --env-file ...`). Supabase fournit normalement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` automatiquement à ses Edge Functions : vérifier leur présence côté Edge, jamais dans `community-config.js`.
4. La clé privée correspond **exactement** au fichier public `import-public-key.pem` inclus dans le ZIP. Une paire de clés différente empêcherait le déchiffrement.
5. Vérifier la fonction au moyen d'un **fichier de test**. Un dépôt valide retourne une référence UUID et `status: pending`; il n'ajoute encore aucun article public.
6. Pour renouveler la paire de clés, générer une nouvelle paire RSA-3072, déployer sa clé privée côté Edge et sa clé publique côté site simultanément. Conserver un moyen de redéployer l'ancienne clé pendant les requêtes en vol.

### Sécurité de l'Edge Function

- Le endpoint est sans connexion (`--no-verify-jwt`), car les dépôts sont anonymes ; il ne possède qu'un droit d'ajouter à la file **pending**.
- Maximum 200 Kio de JSON déchiffré ; 25 paires ; validation redondante côté serveur + domaines `tm_allowed_media`.
- Cinq dépôts par heure par empreinte IP salée ; dédoublonnage SHA-256 ; RLS et révocation des tables/routines sensibles ; RLS ne remplace pas les permissions RPC.
- La limitation n'est pas une protection anti-abus exhaustive : activer des métriques, alertes et idéalement un CAPTCHA si le volume public augmente.
- Les extraits sont déchiffrés **côté Edge** avant stockage privé en attente. Le fichier `.2min` original reste en JSON lisible sur l'ordinateur du contributeur ; seul le paquet transmis est chiffré. Si vous souhaitez un format `.2min` opaque dès la création par le Wizard, il faut adapter ce Wizard et le système de prévisualisation.

## Étape 4 — Revue rédactionnelle

Dans `Authentication → Users`, utiliser un compte de rédaction ; ajouter son UUID autorisé à `tm_editorial_importers` par SQL administrateur :

```sql
INSERT INTO public.tm_editorial_importers(user_id)
VALUES ('UUID_DU_COMPTE_REDACTION')
ON CONFLICT DO NOTHING;
```

Dans Paramètres → Revue des dépôts, ce **compte** peut se connecter, examiner les affirmations et les preuves, puis approuver ou refuser. L'approbation appelle l'import transactionnel existant. Les contributeurs anonymes **n'ont pas à se connecter**.

## Jeux de tests

1. Dans l'accueil, sélectionner `samples/exemple-bfmtv.2min`.
2. Vérifier l'article BFMTV, les 2 paires LCP et RTL et les citations.
3. Avant la case de confirmation, le bouton d'envoi est désactivé.
4. Confirmer et envoyer ; l'Edge Function doit répondre `pending`.
5. Dans Supabase SQL Editor, vérifier (administrateur uniquement) :

```sql
SELECT id,status,reference_title,pairs_count,created_at
FROM public.tm_editorial_submissions ORDER BY created_at DESC LIMIT 10;
```

6. Réessayer le même fichier : `already_pending`, sans doublon.
7. Se connecter comme compte rédactionnel autorisé, inspecter la proposition, approuver ; vérifier les articles, extraits et analyses. Test de refus également.
8. Vérifier les lecteurs anonymes : aucune RPC ni table de revue ne doit leur être accessible, et aucun fichier ne doit produire directement une contribution éditoriale publique.

## Retour arrière

Redéployer V1.0.43 et désactiver la fonction Edge `submit-2min` pour empêcher les nouveaux dépôts. Conserver les tables nouvelles et leur historique de modération tant qu'un audit n'a pas été réalisé. **Ne jamais supprimer les secrets ou fichiers privés sans avoir organisé une rotation / une sauvegarde sécurisée.**
