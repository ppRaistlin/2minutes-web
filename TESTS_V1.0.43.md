# Recette V1.0.43 — résultats disponibles

| Test | Résultat | Portée |
|---|---|---|
| Fichier BFMTV (LCP + RTL, 2 paires) | PASS | Validateur JS + aperçu DOM avec navigateur simulé |
| JSON malformé / structure non valide | PASS | Validateur JS ; erreur JSON gérée dans le module |
| Version .2min incompatible | PASS | Validateur JS |
| Paire refusée ou en attente | PASS | Validateur JS : rejet |
| URL dangereuse, identifiants intégrés | PASS | Validateur JS : rejet |
| Extrait trop court / trop long | PASS | Validateur JS : rejet |
| Paire dupliquée / auto-liaison | PASS | Validateur JS : rejet |
| Attributions / références manquantes | PASS | Validateur JS : rejet |
| Aucun appel d'écriture avant confirmation | PASS | Playwright Chromium desktop + mobile, RPC simulée |
| Preview + bilan après confirmation | PASS | Playwright Chromium desktop + mobile, RPC simulée |
| Interface mobile 390 px et desktop 1366 px | PASS | Playwright Chromium, CSS réel, session simulée |
| Compte non autorisé, interface masquée | PASS | Playwright Chromium + réponse RPC de refus simulée |
| Autorisation côté serveur | NON EXÉCUTÉ EN BASE | Code RPC et droits vérifiés statiquement ; à tester sur Supabase |
| Idempotence SQL après réimport | NON EXÉCUTÉ EN BASE | `ON CONFLICT` + unique index existant ; à tester sur Supabase |
| Rollback SQL si paire invalide | NON EXÉCUTÉ EN BASE | RPC PL/pgSQL transactionnelle ; à tester sur Supabase |
| Refus d'un domaine absent de `tm_allowed_media` | NON EXÉCUTÉ EN BASE | Contrôle SQL présent ; à tester sur Supabase |
| Marquage éditorial avec RPC V4 réelle | NON EXÉCUTÉ EN BASE | Code Web et SQL fournis ; dépend de la migration |
| Votes et compatibilité extension Chrome | NON EXÉCUTÉ EN BASE | Fonctions existantes préservées, recette nécessaire |

L'API de Supabase a été simulée pour les tests navigateur ; aucune migration ni écriture dans la base réelle n'a été effectuée.

Test validateur reproductible : `node tests/test-validator.cjs`.
