# 2Minutes Web/PWA v1.0.44 — Importation rédactionnelle .2min

- Nouvelle rubrique **Importation rédactionnelle** dans Paramètres avec authentification Supabase Auth et vérification serveur des droits.
- Import du format JSON `.2min` `0.1-draft`, aperçu des paires acceptées, auteurs, affirmations, passages et preuves, confirmation humaine explicite.
- Importation atomique/idempotente côté Supabase, sans clé d'administration dans le navigateur et sans modification des fonctions d'écriture communautaire.
- Conservation des explications et preuves dans `tm_editorial_analyses` (accès direct fermé), marquage **« Sélectionné par la rédaction 2minutes »** dans les cartes où la fonction V4 fournit `origin`.
- Fonctions de lecture V4 avec repli sur V3/V2 pour préserver les déploiements précédents.
- Versions et cache PWA mis à jour ; favoris, BD, vidéos et filtres conservés.
- **À lire avant déploiement :** `IMPORT_2MIN_INSTALL.md`, `TESTS_V1.0.44.md` et `supabase-import-editorial-2min-v1.sql`.
- Aucune migration exécutée automatiquement. Les tests SQL réels restent à faire avant mise en production.

---

## V1.0.38 — Recherche dans les titres

- Champ « Mots-clés du titre… » : fond blanc (`#FFFFFF`) uniquement en thème clair.
- Autres champs, boutons, thème sombre et fonctionnalités inchangés.

# 2Minutes v1.0.42 — Filtres et points de vue

- Points de vue fermés par défaut sur mobile et ordinateur.
- Plusieurs points de vue : défilement horizontal tactile et à la souris, avec scroll-snap.
- Bouton de filtres à droite du champ de recherche : orientation des articles sources, orientation des points de vue, journal source et journal des points de vue.
- Filtres appliqués aux résultats chargés depuis Supabase (50 articles maximum par recherche), sans modification de la base.
- Toutes les fonctions existantes conservées.

---

# 2Minutes v1.0.42 — Interface « Journal épuré »

La section **Derniers articles** adopte un affichage éditorial sans imbrication de cartes : articles séparés par une ligne, photos compactes à gauche, titres et orientations directement lisibles. Les autres points de vue s’ouvrent en retrait sous un trait vertical, sans fond ni bordure supplémentaire.

**Mobile :** grille compacte image + titre, comparaison dépliable et contenu sans débordement. Le reste du site, les six planches BD d’origine, les préférences locales, les fonctions Supabase et les images déjà enregistrées restent inchangés.

**Aucune migration SQL nécessaire.**

---

# 2minutes Web/PWA V1.0.38 — Articles et images

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


## V1.0.38 — mise en page des derniers articles

- Cartes restructurées : en-tête compact, photo principale paysage, titre et métadonnées.
- Articles liés dans une section distincte sur toute la largeur avec miniatures, extraits et votes.
- Présentation mobile en colonne, image 16:9 et textes lisibles.
- Aucun changement des fonctions SQL, des données Supabase, des six BD ni de la navigation.


## V1.0.38 — Option D

Cartes avec image paysage et bouton permettant de déplier les articles liés. Les détails sont fermés par défaut sur mobile (≤680 px) et visibles par défaut sur ordinateur. L’interface conserve les titres, photos, orientations, extraits, votes, recherche et Supabase en lecture seule.

## V1.0.38

- Chevron centré avec SVG.
- Libellé « Voir X autres points de vue » et « Masquer X autres points de vue ».
- Suppression du bouton « Voir dans 2minutes » des cartes récentes.


### Ajustements V1.0.38
- Historique « Consultés récemment » masqué.
- Bouton principal « Rechercher ».
- Suppression du sous-titre « Contributions publiques de 2minutes ».
- Pied de page « 2Minutes v1.0.42 ».
- Comparaisons dépliées à l’intérieur du même conteneur que le bouton de dépliage.


## V1.0.38 — Organisation des filtres

Les quatre filtres sont regroupés dans deux sections : Articles sources (Orientation, Média) et Points de vue (Orientation, Média). Les identifiants et la logique de filtrage existante restent inchangés.


## V1.0.38 — essai de couleurs clair / sombre

- Thème clair : fond bleu-gris très pâle, cartes blanches et texte bleu nuit.
- Thème sombre : bleu nuit et surfaces ardoise, liens bleu doux.
- En-tête assorti à chacun des deux thèmes.
- Boutons, champs, filtres et fenêtres harmonisés.
- **Classifications éditoriales inchangées** : gauche rouge, droite bleu.
- Choix dans Paramètres > Apparence : Clair / Sombre / Automatique.
- Aucun changement des fonctions SQL ou de la logique métier.


## V1.0.38 — Graphite & Ivoire

Palette alternative A. Thème clair : fond ivoire, blanc, texte graphite et accent cuivre. Thème sombre : graphite presque noir, surfaces charbon et cuivre clair. Les couleurs éditoriales (gauche rouge et droite bleue), les filtres, les points de vue dépliables, le lecteur BD, la vidéo, Supabase et les réglages restent inchangés. Les thèmes sont sélectionnables dans Paramètres → Apparence.


## V1.0.38

- Fond du bouton Ko-fi adapté à la palette : cuivre en thème clair et bronze en thème sombre, icône inchangée.


## V1.0.38 — Focus harmonisés

Suppression de tous les contours bleus du site ; les indicateurs de focus clavier adoptent le cuivre (clair) et le bronze (sombre), sans perdre l’accessibilité. Les couleurs des orientations éditoriales restent inchangées. Les menus natifs peuvent employer une couleur de surbrillance définie par le système d’exploitation.


## V1.0.38 — Retour aux couleurs précédentes

Retour aux couleurs clair et sombre de la V1.0.28 (bleu-gris clair et bleu nuit), avec les fonctionnalités conservées de la V1.0.31. Couleurs éditoriales inchangées.


## V1.0.38

Rétablissement des fonds d’origine des champs et boutons (avant V1.0.34), sans rétablir les contours. Le fond plus sombre de l’en-tête clair est conservé.


## V1.0.38
- Fond des inputs et selects légèrement assombri (#e8edf4) en thème clair uniquement. Aucun changement au thème sombre ou aux boutons.


## V1.0.38 — en-tête

- Titre « Confrontons les points de vue » ; sous-texte « Mais d’abord… ».
- Boutons BD et TV sous le titre, ouvrant les modales existantes.
- Comportement du logo inchangé ; vidéo en boucle uniquement à l’ouverture.


## V1.0.42 — Passage source par point de vue

- Dans « Derniers articles », chaque point de vue lié affiche désormais son passage source (si renseigné), puis le passage de l’article lié.
- Les passages proviennent de la même liaison et conservent leur direction; aucun texte n’est inventé.
- Activer **manuellement** `supabase-web-source-passages-readonly-v3.sql` dans Supabase SQL Editor avant validation fonctionnelle.
- Le site tente d’abord `list_recent_articles_public_v3`, puis V2/V1 si la migration n’est pas installée : dans ce cas, le passage source n’est pas disponible.
- Aucun changement d’écriture, de vote ou d’authentification.


## V1.0.42
- Échelles éditoriales visuelles dans toutes les listes de médias et favoris, sans badges textuels.
- Accueil : sélecteur « Voir mes favoris / Tout voir », mémorisé localement. « Tout voir » place les articles des médias favoris en premier, en préservant leur ordre récent au sein de chaque groupe.
- Filtrage et recherche existants conservés.

## V1.0.44 — dépôt libre / revue avant publication

- Bouton d'import `.2min` bien visible sur l'accueil ; aucune authentification requise pour déposer.
- Validation locale et prévisualisation des affirmations, de leurs auteurs et des liens de preuve.
- Chiffrement hybride RSA-OAEP 3072 / AES-GCM 256 avant envoi à Supabase Edge Functions ; la clé privée **n'est pas** livrée dans le ZIP GitHub Pages.
- Dépôt en attente, dédoublonné et limité en fréquence ; revue puis approbation via un compte rédactionnel autorisé dans les paramètres.
- Conserve la migration éditoriale V1.0.43 comme prérequis. Voir `INSTALLATION_IMPORT_2MIN_V1.0.44.md` et `TESTS_V1.0.44.md`.

## V1.0.45
Correction de la lecture bidirectionnelle des passages source et lié dans les cartes de la page d’accueil, sans changement SQL.

## V1.0.46
- Suppression des messages sur les extraits manquants.
- Support optionnel de `pairs[].reference_excerpt` (12–600 caractères) dans les fichiers `.2min`.
- Import des deux passages dans leurs articles respectifs lorsque le passage de référence est fourni.
- Migration additive `supabase-import-reference-excerpts-v1.0.46.sql` à appliquer manuellement.
- Les anciens fichiers `.2min` restent compatibles ; aucun passage absent n'est inventé.

## V1.0.49
- Passage de référence facultatif maintenu (`reference_excerpt`) ; les fichiers anciens restent compatibles.
- `reference_article.image_url` et `pairs[].target_article.image_url` facultatifs, URL HTTPS validées localement et côté serveur.
- La migration SQL remplit `tm_articles.image_url` lors de la création ou si l'image est absente, sans remplacer les photos existantes.
- Carrousel horizontal élargi, responsive et défilement conservé.
- Les photos manquantes dans les fichiers déjà importés ne sont pas inventées ni récupérées automatiquement.

## V1.0.50 — Accueil regroupé par article de référence
- Nouvelle RPC `list_recent_articles_public_v5` à installer manuellement avec `supabase-home-reference-only-v1.0.50.sql`.
- Articles rédactionnels affichés seulement lorsqu'ils sont référence d'au moins une analyse.
- Un article lié devient entrée autonome dès qu'il est référence d'une autre confrontation.
- Conservation des fonctions V4 et des liaisons bidirectionnelles en base.
- Repli sur V4 si V5 absente (ancien comportement jusqu'à la migration).

## V1.0.54
- Favoris de l'accueil : inclut le média source ou tout média lié.
- Bouton « Confrontez » : modale de participation avec importateur .2min intégré.
- Suppression du grand encart d'importation de l'accueil et de la mention « Sans compte · Vérification du fichier avant envoi ».
- Les deux liens d'extension restent configurables (les liens génériques ne sont pas des fiches 2Minutes).

## V1.0.54
- Bouton Confrontez : logo 2Minutes monochrome blanc via l'icône locale existante.
- Dans l'importateur : guide d'utilisation du Wizard et emplacement de téléchargement désactivé jusqu'à réception du fichier officiel.
- Aucun faux lien de téléchargement, aucune modification Supabase.

## V1.0.54
- Boutons d’en-tête : Lisez, Regardez, Confrontez.
- L’aide à l’import précise que le Wizard se lance dans l’IA préférée de l’utilisateur.
- Téléchargement du Wizard toujours indisponible jusqu’à réception du fichier.

## V1.0.55
- Suppression du trait central de toutes les échelles éditoriales du site (indicateur circulaire conservé).
- Le bouton « Confrontez » de l’en-tête devient « Participez » avec une icône d’ampoule blanche. Le dialogue de participation et les imports .2min restent inchangés.
