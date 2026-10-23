# 2minutes V2 — contrat frontend (aucune migration DB incluse)

## Contribution
- Une liaison relie deux articles de médias pris en charge.
- Aucun texte libre utilisateur.
- Une contribution est un extrait sélectionné directement dans l'article lié.
- Plusieurs extraits distincts peuvent exister pour une même paire d'articles.
- Les extraits existants doivent être visibles avant ajout pour limiter les doublons.
- Les contributions non confirmées restent visibles avec le statut « Proposé — pas encore confirmé ».
- Votes prévus : pertinent / hors sujet. Un motif séparé « extrait absent de l'article » est prévu au backend.

## Workflow implémenté
1. Depuis l'article A : Ajouter un article lié.
2. Coller l'URL B ; le domaine doit exister dans la base locale.
3. 2minutes mémorise A et ouvre B.
4. Dans B, sélectionner un passage réel dans la page.
5. Ouvrir 2minutes > Utiliser la sélection.
6. Prévisualiser l'extrait puis publier.

## Backend attendu ultérieurement
Le frontend réserve les opérations `article_excerpts_view`, `create_article_excerpt` et `vote_article_excerpt`.
Aucun SQL ni schéma de base de données n'est fourni dans cette Candidate.

## V2 Web future
Le futur site doit réutiliser le même backend : coller une URL, afficher orientation + articles liés + extraits, permettre l'ajout d'une liaison/extrait.


## V2.0.17 — Exploration dédiée
La popup conserve orientation + articles liés communautaires. Le bloc détaillé Explorer d’autres sources est déplacé vers `explore.html`, ouvert dans un onglet complet. AFP, filtres d’orientation, favoris, recherche et liste des médias y sont affichés sans limite de hauteur de popup.


## V2.0.25 — découverte gratuite d'articles
- Page Élargir la perspective: RSS/Atom local quand un flux officiel exploitable est connu/découvert.
- Jusqu'à 3 articles candidats classés localement par proximité du titre courant.
- Aucun backend, aucune API payante, aucun scraping Google.
- Fallback: recherche Web avec les 5 mots-clés lorsque RSS indisponible/échoue.
- Les résultats RSS restent des candidats; l'utilisateur décide s'ils sont réellement liés.


## V2.0.29 — Date manuelle
Si la date de publication n’est pas détectée, l’utilisateur peut la saisir. Elle est mémorisée localement par URL canonique et active ±3 jours par défaut. La date reste modifiable.


## V2.0.30 — Date manuelle
- Choisir une date manuelle la valide immédiatement (le bouton ✓ reste compatible).
- La période bascule réellement sur ±3 jours.
- Tous les liens Google (AFP et médias) sont reconstruits avec `after:` / `before:`.
- Les candidats RSS sont recalculés avec la même fenêtre.


## V2.0.33 — Favoris et recherche média
- Le bloc bas de la page Explorer affiche uniquement les médias explicitement favoris; aucune suggestion automatique.
- En recherche par nom/domaine, chaque résultat affiche le badge d’orientation G/CG/C/CD/D avec les mêmes couleurs que le badge Chrome.
- Hors recherche, les badges individuels restent masqués car l’onglet actif donne déjà l’orientation.

## V2.1 Community implementation
- Popup highlights at most 2 linked articles, prioritizing outlets on the opposite side of the center.
- All linked articles are available in linked.html.
- A link A↔B is unique and bidirectional; multiple distinct excerpts are allowed.
- Before opening B, existing excerpts for A↔B are shown to prevent duplicates.
- No free text: publication requires a real browser selection verified against B's visible page text.
- Excerpts remain visible before confirmation. Net community score >= 3 marks an excerpt confirmed.
- Votes are one active vote per local 2minutes installation and excerpt.
- supabase-v2-community.sql creates the backend; community-config.js accepts only public Supabase URL + publishable/anon key.


## V2.1.4
- Popup média scrollable avec en-tête sticky.
- Un article lié visible à la fois, navigation ‹ › entre articles.
- Nombre d'articles liés entre parenthèses uniquement si > 0.
- Confirmation de suppression via petite modal interne, sans confirm() navigateur.
- Explorer d'autres sources reste toujours présent.


## V2.1.5 — Version UI
Le numéro affiché dans la popup est lu dynamiquement depuis `chrome.runtime.getManifest().version`; aucune version UI n’est codée en dur.


## V2.1.7
- Orientation éditoriale et Explorer d’autres sources sont deux cartes carrées 50/50.
- L’échelle d’orientation est supprimée de la popup.
- Explorer est une grande tuile avec icône et libellé.

- V2.1.10: badges d’orientation des articles liés agrandis et renforcés pour lisibilité (G/CG/C/CD/D).


## V2.1.12
- Community excerpt maximum: 600 characters.
- Community status/votes/delete controls are anchored to the bottom of the point-of-view card to reserve more vertical space for the excerpt text.

## V2.1.13 — Ajout guidé d’un point de vue
- Le bouton « Ajouter un article lié » ouvre une modal intégrée à 2minutes.
- La modal explique le processus en 5 étapes avant toute navigation.
- L’URL de l’article lié est saisie et vérifiée directement dans cette modal.
- Les passages déjà proposés pour la paire sont affichés avant de poursuivre.
- Aucun texte libre n’est autorisé : seul un passage réellement sélectionné dans l’article peut être publié.


## V2.1.28
- Corrige le workflow de sélection: un seul onglet cible est créé.
- Le side panel est ouvert au niveau de la fenêtre avant la création de l'onglet, afin de conserver le geste utilisateur et rester ouvert sur le nouvel onglet.
