# 2minutes — Extension 2.2.0 / Workflow de liaison V2 (candidate)

## Fonctionnement
1. Depuis l’article source, saisir l’URL liée.
2. Sélectionner le passage source dans le side panel, ou choisir « Sélectionner plus tard ».
3. L’article lié s’ouvre ; sélectionner le passage dans cet article.
4. Contrôler les deux passages dans le récapitulatif puis publier.
5. « Modifier le passage source » réactive ou rouvre son onglet ; les deux extraits sont conservés localement jusqu’à publication.

## Installation et sécurité
Cette extension nécessite d’exécuter manuellement `supabase-workflow-v2-atomic.sql` **après sauvegarde et revue de la migration**. Ne pas tester la publication tant que la migration n’est pas installée. La publication utilise une fonction atomique sans suppression ni modification des anciennes fonctions. La capture du texte côté client est vérifiée par la page et l’onglet ; le serveur n’est pas en mesure de certifier lui-même qu’une sélection provient du DOM réel.

## Limites de cette candidate
- Pas de reprise automatique d’un brouillon après réouverture du navigateur ; le brouillon demeure en storage et se retrouve en ouvrant le side panel.
- Un seul brouillon de liaison actif ; ne démarrez pas une autre liaison avant la publication ou l’abandon.
- Les anciens brouillons V1 ne sont pas migrés automatiquement.
- La fonction SQL publie 1 ou 2 extraits de façon atomique ; la modification a posteriori d’un passage source déjà publié utilise l’ancien workflow directionnel, qui reste inchangé.
- Pas de validation physique Chrome effectuée ici ; chargez l’extension non empaquetée pour la recette.

## Tests conseillés
Sélection source immédiate, sélection reportée, retour à l’onglet source, modification des deux passages, publication avec et sans passage source, erreur de connexion SQL, annulation et compatibilité avec les contributions déjà présentes.


## V2.2.1 — Corrections de recette

- La popup Chrome se ferme au lancement du workflow depuis « Ouvrir l’article et sélectionner un passage ».
- La sélection source est affichée et dépliée automatiquement dans le side panel dès l’arrivée sur l’article lié.
- Suppression du raccourci « ← Article source ». La modification reste disponible dans le récapitulatif.
- « Abandonner le brouillon » demande confirmation, efface le brouillon et la sélection temporaire, puis ferme le panneau via le service worker. Les onglets Web restent ouverts.
- Aucun changement au schéma ou à la migration Supabase.

Recette navigateur encore nécessaire : Chrome supportant sidePanel.close, Chrome plus ancien (repli), validation du parcours intégral et vérification après changement d’onglet.

## V2.2.2 — Passage source dans le récapitulatif

- Correction d'une course entre `chrome.storage.onChanged` et la transition vers l'article lié : le passage source est désormais figé avant la première écriture asynchrone.
- Une mise à jour du même brouillon n'efface plus la sélection en cours si l'étape n'a pas changé.
- Le service worker ne remplace plus un passage source sauvegardé par une chaîne vide lors de l'ouverture de l'article lié.
- Le récapitulatif affiche le passage source sauvegardé, ou « Passage source reporté » seulement si l'utilisateur a réellement choisi « Sélectionner plus tard ».
- Aucun changement SQL ou Supabase.

### Recette ciblée
1. Depuis l'article source, renseigner l'URL liée.
2. Sélectionner au moins 12 caractères puis « Valider et ouvrir l'article lié ».
3. Vérifier le passage source dans le side panel de l'article lié.
4. Sélectionner le passage lié, aller au récapitulatif, vérifier la présence des deux textes.
5. Refaire un cycle via « Sélectionner plus tard » ; seul ce cycle doit afficher « Passage source reporté ».
6. Recharger l'article lié et vérifier que le texte source persiste.


## V2.2.3 — Récapitulatif et publication
- Masquage de l’encadré « Passage source » dans le récapitulatif ; les deux passages restent visibles dans « Vérifier avant publication ».
- Bouton de publication avec attente visuelle et actions bloquées pendant la RPC.
- Affichage de « Liaison publiée » uniquement après confirmation de l’enregistrement.
- Fermeture automatique du panneau après confirmation, avec nettoyage du brouillon et préservation des onglets.
- En cas d’échec RPC, réactivation des actions sans perte du brouillon.
- Si la fermeture échoue après une publication réussie, le bouton reste désactivé pour éviter les doublons.


## V2.2.4 — points de vue dans la popup
- « Ajouter un point de vue ».
- Statut « Proposé — pas encore confirmé » retiré ; compteurs de votes conservés.
- « Supprimer le point de vue » est un lien texte, avec confirmation existante.
- Les flèches internes changent seulement le bloc extrait (texte, votes et suppression), sans recharger l’en-tête du média lié.
- La page courante cherche et surligne le passage source associé au point de vue, et défile jusqu’à lui. Les passages source sont lus via le RPC directionnel de paire déjà installé. Si plusieurs candidats ne peuvent pas être associés sans ambiguïté, aucun passage arbitraire n’est surligné.
- Aucun changement SQL.


## V2.2.5 — Suppression automatique des liaisons vides

- Lors de la suppression par l’auteur du dernier point de vue d’une paire, `delete_article_excerpt_v2` supprime aussi la ligne correspondante de `tm_article_links`.
- La liaison reste présente s’il existe au moins un autre passage dans un sens ou dans l’autre.
- Les lignes de `tm_articles` et les médias sont conservés. Les votes associés au passage supprimé sont gérés par la cascade FK existante.
- À exécuter une seule fois avant test : `supabase-v2.2.5-delete-empty-links.sql` dans Supabase SQL Editor. La fonction existante est remplacée avec la même signature ; la migration est rejouable.
- Le ZIP ne modifie pas la base à distance.

### Tests
1. Créer une liaison A-B avec deux extraits. Supprimer le premier : la liaison doit rester.
2. Supprimer le dernier : la liaison doit disparaître, et la liste des articles liés se mettre à jour après rechargement.
3. Vérifier que A et B existent toujours dans `tm_articles`.
4. Vérifier que supprimer un extrait appartenant à un autre auteur renvoie `false`, sans supprimer la liaison.


## V2.2.6 — Correctif suppression PGRST203

La base peut contenir deux surcharges de `delete_article_excerpt_v2` : `(p_client_id text, p_excerpt_id uuid)` et `(p_excerpt_id uuid, p_client_id uuid)`. PostgREST ne peut pas distinguer les deux appels nommés : erreur `PGRST203`.

**Installation :** exécuter `supabase-v2.2.6-fix-delete-overload.sql` dans Supabase SQL Editor après la migration v2.2.5. Le script retire uniquement la signature historique `(text,uuid)`, garde la fonction actuelle `(uuid,uuid)`, et demande un rafraîchissement du cache PostgREST. Il ne supprime aucune donnée.

**Test :** supprimer un point de vue dont on est l'auteur depuis l'extension ; vérifier que la liaison reste présente tant qu'il reste un passage et disparaît quand le dernier passage est supprimé.


## V2.2.7 — Suppression du dernier point de vue

Installer `supabase-v2.2.7-delete-last-point.sql` (migration manuelle). En V2 les deux sens d'un lien peuvent contenir un passage ; la suppression du dernier passage affiché d'un côté entraîne la suppression du lien si les seuls passages résiduels appartiennent au même contributeur. Les extraits d'autres contributeurs et leurs votes sont préservés. Les cartes sans passages visibles dans le sens consulté ne sont plus affichées par l'extension. Vérifier la migration avant de tester.


## V2.2.8 — annulation lors de la navigation

- Aux étapes `SOURCE_SELECTION`, `TARGET_SELECTION`, `SOURCE_EDIT`, `TARGET_EDIT`, toute navigation (URL modifiée, rechargement ou fermeture de l’onglet en cours de sélection) annule la liaison et efface le brouillon.
- Le side panel est fermé via `chrome.sidePanel.close` si disponible, sinon désactivé pour les onglets du brouillon.
- Un simple changement d’onglet n’annule pas la procédure.
- Le premier chargement/redirection de l’article lié créé par « Valider et ouvrir l’article lié » est autorisé ; toute navigation ultérieure l’annule.
- Les étapes `REVIEW` et `PUBLISHING` ne sont pas affectées. Aucun changement Supabase requis.


## V2.2.9 — Navigation de l’article source

- Ajout de la permission Chrome `webNavigation` pour détecter les navigations du document principal depuis l’onglet source, y compris le rechargement de la même URL.
- Détection des changements de route sur les sites dynamiques via `onHistoryStateUpdated`.
- Le side panel tente également de se fermer lui-même lorsque le brouillon est supprimé, en plus de la fermeture demandée par le service worker.
- Le changement d’onglet ne déclenche aucune annulation. Le chargement initial autorisé de l’article lié et les récapitulatifs sont préservés.
- Aucune migration SQL.

Test : lancer une liaison depuis A, rester à « Sélectionner un passage source », puis naviguer dans cet onglet vers une autre page ou recharger A. Le brouillon disparaît et le side panel se ferme. Recommencer et utiliser « Valider et ouvrir l’article lié » : le workflow doit se poursuivre.
