# 2Minutes Chrome V2.3.0 — EditorialScale V1

Basé sur 2Minutes Chrome V2.2.9 (workflow de liaison et navigation source conservés).

## Inclus
- Composant partagé `editorial-scale.js` et CSS : score interne -4/-2/0/2/+2/+4, dégradé rouge-gris-bleu, repères Gauche/Centre/Droite en mode complet et barre seule en mode compact.
- Popup : orientation du média en échelle complète et échelle compacte dans les articles liés.
- Side panel de liaison : échelles compactes pour source et cible.
- Notification flottante de 3 secondes lors d'un changement de média reconnu dans l'onglet au premier plan ; affichage avant le badge.
- Paramètre Chrome local « Afficher l’orientation à l’arrivée sur un média », coché par défaut.
- Clic sur la notification : ouvre la consultation Chrome dans la popup standard ; une fenêtre de consultation de repli peut être utilisée si Chrome interdit `action.openPopup()`.
- Pas de SQL ni modification Supabase. Badge existant conservé.

## Test manuel prioritaire Chrome
1. Installer le dossier décompressé via `chrome://extensions` → mode développeur → charger l'extension non empaquetée.
2. Activer le paramètre. Aller vers un média reconnu : notification 3 secondes puis badge ; cliquer avant la fin pour ouvrir la consultation.
3. Naviguer vers un autre article sur le même domaine : pas de notification. Actualiser : pas de notification.
4. Aller vers un autre média reconnu dans le même onglet : nouvelle notification.
5. Désactiver le paramètre : badge immédiat sans notification.
6. Vérifier les cinq positions, média inconnu, popup, article lié et side panel durant une liaison ; tester les onglets et navigations rapides.

Statut : candidate, tests navigateur et performances réels non exécutés.


## Chrome V2.3.1 — Navigation, onglets et fermeture du panneau

- Notification relancée lors de chaque nouvelle page reconnue, y compris au sein du même média, ainsi qu'à chaque retour vers un onglet contenant un média reconnu.
- Notification de l'onglet quitté annulée immédiatement ; aucun message pour les sites non répertoriés ; badge après les 3 secondes ou immédiatement si l'affichage échoue / est désactivé.
- Détection de la disponibilité du content script à l'ouverture d'un document ; protection par token contre les messages tardifs ou les onglets inactifs.
- Le side panel de sélection se ferme si l'onglet actif ou son URL canonique ne correspond plus au document attendu à l'étape en cours (source, cible, récapitulatif).
- Changement d'onglet : ferme le panneau mais conserve le brouillon. Navigation ou rafraîchissement pendant la sélection : la politique d'annulation du brouillon V2.2.9 demeure.
- Les transitions explicitement autorisées du workflow et les redirections initiales vers l'article lié sont protégées.
- Aucune migration SQL.

### Recette dans Chrome
1. Ouvrir Le Monde, attendre 3 s, naviguer vers un autre article du Monde : nouvelle notification.
2. Basculer Monde → Figaro → Monde : chaque activation affiche l'orientation du média de l'onglet actif, et l'ancienne notification disparaît.
3. Passer vers un onglet sans média : pas de notification, badge vide.
4. Débuter une sélection source, changer pour un autre onglet (même domaine ou différent) : le panneau se ferme sans perdre le brouillon.
5. Redémarrer la liaison normalement pour poursuivre depuis la page attendue ; valider et ouvrir l'article lié : la navigation autorisée n'est pas annulée.
6. Pendant la sélection, naviguer vers une autre page ou recharger : brouillon annulé par la règle existante et side panel fermé.
7. En étape récapitulatif, passer sur une page étrangère : panneau fermé.

Statut candidate : recette navigateur réelle à effectuer.


## V2.3.2 — Paramètres au centre
- La vue Paramètres remplace temporairement le contenu central de la popup, sans surimpression flottante.
- Flèche de retour vers la consultation courante, sans rechargement.
- Case à cocher « Afficher l’orientation à l’arrivée sur un média » activée par défaut, préférence conservée dans `twoMinutesOrientationToastEnabled` sur `chrome.storage.local`.
- Aucune modification Supabase.


## Chrome V2.3.3 — Notification 20/80
- Logo original 2Minutes à gauche (20 %).
- Nom du média, échelle et repères à droite (80 %).
- Mention « Cliquez pour consulter les points de vue » préservée.
- Durée 3 secondes, clic et réglages inchangés.

## Chrome V2.3.4 — récapitulatif et notification
- Trois boutons alignés : Abandonner / Recommencer / Publier. Recommencer efface les deux passages temporaires puis retourne à la sélection source, en conservant les deux URL.
- Nom réel du média au-dessus de chaque échelle éditoriale du side panel.
- Notification réduite d'environ 10 %, avec logo original, proportions 20/80, dégradé, nom du média et invitation cliquable inchangés.
- Aucun changement de schéma Supabase.

## Chrome V2.3.5
- Dans les points de vue, le nom du média est à gauche de l’échelle compacte, sur la même ligne.
- Titre limité à trois lignes, avec ellipse au-delà ; titre intégral accessible au survol.
- Aucun changement de données Supabase.

## Chrome V2.3.6 — métadonnées de l’article lié

- Correction de la perte de photographie de l’article lié lors de la publication du workflow V2.
- Lecture des métadonnées directement dans l’onglet exact de l’article cible, à la transition vers le récapitulatif et nouveau contrôle avant publication.
- Persistance de `targetImageUrl` et `targetTitle` dans le brouillon, avec conservation des données déjà valides.
- Rejet d’une URL d’image identique à celle de l’article et refus de métadonnées provenant d’un autre onglet / article.
- Aucune migration Supabase. Les contributions publiées précédemment sans photo ne sont pas rétroactivement enrichies.

## Chrome V2.3.7
- Vote counts in the linked-article card: thumbs doubled to 20 px; same row and baseline as « Supprimer le point de vue ».
- Orientation notice: fixed CSS width (311 px, constrained only by viewport width), same internal spacing on all desktop pages instead of switching at 420 px.
- Browser zoom and display scaling can still change the displayed physical size; CSS pixel width is consistent.


## Chrome V2.3.8 — harmonisation du titre

Titre de référence du site Web : « Confrontons les points de vue ». Mise à jour du nom dans le manifeste Chrome, du texte de survol de l’icône, de l’en-tête Articles liés et du titre de consultation communautaire en français. Aucun changement des fonctionnalités.

## V2.3.9 — titre visible de la popup

L’en-tête de la popup affiche maintenant « Confrontons les points de vue », comme le site Web de référence, et non plus la citation de Jacques Chirac. Le bouton TV reste accessible sous le titre.

## Chrome 2.3.11
- Planche BD utilise toute la largeur centrale; flèches sous l’image; navigation et contenu inchangés.

## V2.3.12
Lien « les autres points de vue » sous les visionneuses BD et vidéo, vers https://ppraistlin.github.io/2minutes-web/ (nouvel onglet).

## V2.3.13
- Le lien « les autres points de vue » se trouve dans l’en-tête, juste sous les boutons BD et Vidéo.
- Suppression du lien dans les visionneuses BD et Vidéo.

## Chrome V2.3.14
- Lien du site retiré de l’en-tête.
- Encadré de renvoi vers le site Web placé directement avant la mention sur la classification.


## Chrome V2.3.15
- En-tête uniformisé sans barre verticale ni dégradé.
- Titre sur une seule ligne, logo et bloc titre/BD/Vidéo alignés verticalement.
