# 2minutes Web/PWA v1.0.4 — mise à jour visuelle

Source : extension 2minutes V2.1.36. Site statique indépendant ; aucune modification des extensions ni aucune migration SQL.

## Déployer
1. Créer un dépôt GitHub, par exemple `2minutes-web`.
2. Copier **le contenu de ce dossier** à la racine du dépôt ; branche `main`.
3. Dans GitHub → Settings → Pages → Build and deployment, sélectionner **GitHub Actions**.
4. Le workflow `Deploy GitHub Pages` publie le site à `https://UTILISATEUR.github.io/2minutes-web/`.
5. Pour tester en local, exécuter `python -m http.server 8080` depuis ce dossier, puis ouvrir `http://localhost:8080` (éviter `file://` pour la PWA).

## Ce qui fonctionne dans cette livraison
- Site mobile-first responsive, installable comme PWA sur appareils compatibles ; partage d'URL via manifest Share Target là où il est pris en charge, collage comme repli.
- Analyse d'URL canonique, affichage de l'orientation **depuis le référentiel réel V2.1.36** (gauche rouge / droite bleu), lien externe vers l'article.
- Lecture seule des contributions réelles via RPC Supabase existant `list_article_views_v2`, sans appels de création, suppression ou vote.
- Consultation des extraits avec état et compteurs de votes.
- Annuaire filtrable, favoris locaux, historique local limité à 20, thème, langues de l'extension partiellement reprises.
- Recherche externe **manuelle** via liens Google `site:` sur médias d'orientation différente, sans extraction automatique de résultats, ni qualification automatique du sujet.
- Vidéo optionnelle, déploiement GitHub Actions, service worker et proposition de mise à jour.

## Limitations transparentes / travail d'intégration restant
- Le navigateur **ne peut pas lire automatiquement les titres ou le texte de pages de presse** via un simple collage de lien (CORS). Le titre du média est donc utilisé à défaut ; le titre peut venir du partage mobile. Aucun faux titre n'est inventé.
- Le compte facultatif et la synchronisation des favoris/préférences **ne sont pas activés** dans cette première livraison : aucun schéma de préférences synchronisées ni flux d'authentification Web validé dans le ZIP source. Ne pas écrire dans Supabase sans plan de sécurité et migrations validées. Favoris et préférences restent locaux.
- Les traductions métier existantes sont chargées ; les nouveaux libellés propres à la PWA sont encore principalement en français. Traductions complètes avant publication internationale.
- Le moteur externe ne retourne pas directement des articles dans la PWA : il propose des recherches ciblées dans des onglets externes, sans API payante.
- Pour une icône PWA optimale sur Android/iOS, produire ultérieurement des PNG 192×192 et 512×512 ; les icônes actuelles viennent du ZIP.
- Ne pas interpréter les couleurs de classification comme une évaluation de véracité. Les données proviennent du référentiel local de l'extension et ne sont pas une source de vérité absolue.
- Important : la PWA et les extensions n'ont pas encore d'authentification partagée ; aucun utilisateur ne doit être invité à saisir ses identifiants dans un dispositif non finalisé.

## Sécurité
La clé `sb_publishable_` est publique par définition. Ne jamais y placer une clé `service_role`/secret. RPC consulté : `list_article_views_v2` uniquement. Ne modifier aucune règle RLS ni aucun SQL de la base existante sans validation. Les URL et extraits sont insérés via `textContent`, sans HTML utilisateur.

## V1.0.1 — correction recherche « Explorer d’autres sources »
- Médias proposés dans la langue et le pays du média analysé, lorsque connus ; diversité d’orientations, priorité à deux médias d’orientation opposée puis au centre. Aucune prétention que des articles pertinents ont déjà été trouvés.
- Médias affichés par nom et orientation, et non par ordre alphabétique mondial des domaines.
- Mots-clés issus du titre réellement fourni par l’utilisateur/partage, ou suggestion prudente issue du dernier segment de l’URL ; jamais du seul domaine. Si aucune suggestion valable, la saisie est demandée et les liens restent désactivés.
- Titre éditable dans la fiche article. Aucune extraction CORS miraculeuse : un vrai service de métadonnées serveur sera nécessaire pour automatiser cela sur des sites qui bloquent la lecture cross-origin.
- Recherche Google externe sur demande, sans clé payante, sans mutation Supabase.

## V1.0.4 — identité visuelle et version

- Le titre texte 2min de la barre supérieure est remplacé par l’icône d’origine (`icons/icon128.png`).
- La version `v1.0.4` est visible en pied de page et dans les paramètres.
- Cache PWA versionné en `2minutes-pwa-v1.0.4`.


### 1.0.4
- Démarrage automatique de la vidéo à l’ouverture du dialogue (avec repli si lecture bloquée par le navigateur).
- Icône de l’en-tête agrandie x3 : 156 px sur ordinateur, 138 px sur mobile.

V1.0.4: Video loops; logo left and slogan/tagline in header; top and bottom navigation links hidden.
