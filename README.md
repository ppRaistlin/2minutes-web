# 2minutes Web/PWA V1.0.22 — Articles et images

- Correctif de chargement : suppression du `referrerPolicy=no-referrer` forcé pour les photos des éditeurs ; chargement différé et décodage asynchrone conservés.
- Distinction claire entre « Aucune photo enregistrée » (URL absente en base) et « Image inaccessible » (URL présente, mais téléchargement échoué).
- Correction de la construction du lien autour de la photo principale des cartes.
- `diagnostic-photos-lecture-seule.sql` : requêtes à exécuter manuellement dans Supabase pour comprendre pourquoi certaines photos restent absentes.
- Aucune donnée ni permission Supabase modifiée.
- Prérequis pour afficher les photos : migrations V2.1.37 et V2.1.42 de l’extension + RPC `list_recent_articles_public_v2` (fourni dans `supabase-web-article-images-readonly-v2.sql`).
- **Important** : les anciens articles enregistrés sans `image_url` ne peuvent pas être réparés par une simple mise à jour du site ; il faut disposer d’une vraie URL d’image enregistrée dans Supabase.

# 2minutes Web/PWA v1.0.17

## V1.0.13

- Bouton principal « Comparer » au lieu de « Analyser ».
- Suppression du texte sur le partage d’URL sous le formulaire.
- Aide « ? » accessible à côté d’« Adresse de l’article » : copie du lien et suppression manuelle des paramètres superflus.
- Cache PWA renouvelé.

## V1.0.12
- Bouton Ko-fi 42 x 42 px, fond bleu.

- Ajout du bouton Ko-fi immédiatement à droite de Paramètres. Il ouvre https://ko-fi.com/ppraistlin dans un nouvel onglet.
- Visuel fourni utilisé pour le bouton.
- Cache PWA actualisé pour inclure le visuel.


**Nouveau :** slogan « Réfléchissez deux minutes », fond distinct sur l’icône de navigation active, section « Derniers articles » avec recherche dans les titres et extraits liés les plus plébiscités.

## Étape Supabase obligatoire pour « Derniers articles »

La version précédente n'expose pas de RPC de liste des articles récents. Ouvrir **Supabase → SQL Editor**, examiner et exécuter `supabase-latest-articles-readonly.sql` : cette fonction est en lecture seule, accessible publiquement, limitée à 50 articles par appel, et ne modifie ni tables, ni votes, ni extensions. Sans cette étape, un message explicite est affiché dans la rubrique, sans données fictives.

**Photos :** le schéma `tm_articles` existant ne contient aucune URL de photographie d’article. Un visuel « Photo non disponible » est affiché tant qu’un pipeline de métadonnées autorisé n’a pas été conçu ; aucune photo trompeuse n’est inventée.

"Derniers" signifie derniers liens enregistrés par la communauté, pas tous les derniers articles publiés par les journaux. La recherche est exécutée côté Supabase dans le champ titre, et le passage affiché pour chaque lien est celui au meilleur score pertinent/hors sujet, lorsqu’il en existe.

# 2minutes Web/PWA v1.0.5 — mise à jour visuelle

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

## V1.0.5 — identité visuelle et version

- Le titre texte 2min de la barre supérieure est remplacé par l’icône d’origine (`icons/icon128.png`).
- La version `v1.0.5` est visible en pied de page et dans les paramètres.
- Cache PWA versionné en `2minutes-pwa-v1.0.5`.


### 1.0.5
- Démarrage automatique de la vidéo à l’ouverture du dialogue (avec repli si lecture bloquée par le navigateur).
- Icône de l’en-tête agrandie x3 : 156 px sur ordinateur, 138 px sur mobile.

V1.0.5: Video loops; logo left and slogan/tagline in header; top and bottom navigation links hidden.

## V1.0.5
- Lecture vidéo en cliquant sur le logo, boucle maintenue et attribution Jacques Chirac.
- Navigation en-tête par icônes Accueil et Médias, paramètres conservés.
- Suppression des deux raccourcis Accueil vers médias et favoris.
- Pays par défaut configurable dans Paramètres, repris dans le filtre annuaire et stocké localement.

## V1.0.17
- Lecteur BD sans bande de miniatures ni croix : fermeture par clic hors modale ou touche Échap.
- Six images JPG fournies par l’utilisateur, copiées à l’identique et dans le même ordre.
- Flèches SVG centrées dans les boutons circulaires ; swipe mobile conservé.
- Aide de l’adresse URL en fenêtre centrée et limitée à la hauteur de l’écran.

## V1.0.18 — Images des articles (extension V2.1.42)
- Les images des articles principaux et liés sont maintenant affichées depuis leurs propres champs `image_url`, sans réutiliser une autre image.
- Les cartes montrent média, orientation, date de dernière contribution, extrait plébiscité et votes.
- Comparer utilise `list_article_views_v3` avec repli sur V2, et `get_public_article_metadata_v1` pour le titre/l'image de l'article principal.
- La section Derniers articles utilise `list_recent_articles_public_v2` avec repli sur V1 (sans photos).
- **Migration SQL à exécuter manuellement** : `supabase-web-article-images-readonly-v2.sql`. Nécessite les migrations de l'extension V2.1.37 et V2.1.42. Ne pas exécuter si `tm_articles.image_url` n'existe pas.
- Aucun changement d'interface d'écriture, aucun changement de RLS, aucune modification des contributions existantes.
- Sur GitHub Pages, les images externes peuvent ne pas s'afficher lorsque le serveur distant bloque l'intégration ; un emplacement neutre apparaît.
- La fonction SQL ne lit que les articles présents dans les liens communautaires ; aucun historique privé n'est exposé.
- Vérifications locales : syntaxe JavaScript, présence des six JPG de l'utilisateur, intégrité ZIP. Tests Supabase réels non exécutés ; migration non appliquée.


## V1.0.22 — mise en page des derniers articles

- Cartes restructurées : en-tête compact, photo principale paysage, titre et métadonnées.
- Articles liés dans une section distincte sur toute la largeur avec miniatures, extraits et votes.
- Présentation mobile en colonne, image 16:9 et textes lisibles.
- Aucun changement des fonctions SQL, des données Supabase, des six BD ni de la navigation.


## V1.0.22 — Option D

Cartes avec image paysage et bouton permettant de déplier les articles liés. Les détails sont fermés par défaut sur mobile (≤680 px) et visibles par défaut sur ordinateur. L’interface conserve les titres, photos, orientations, extraits, votes, recherche et Supabase en lecture seule.

## V1.0.22

- Chevron centré avec SVG.
- Libellé « Voir X autres points de vue » et « Masquer X autres points de vue ».
- Suppression du bouton « Voir dans 2minutes » des cartes récentes.
