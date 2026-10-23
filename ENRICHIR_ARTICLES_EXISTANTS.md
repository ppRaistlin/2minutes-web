# Enrichir des articles déjà importés — V1.0.48

Les données existantes ne sont jamais complétées par invention.

1. Préparer un **nouveau** fichier `.2min` avec les mêmes URL canoniques et les mêmes paires acceptées.
2. Ajouter `reference_excerpt` (passage authentique de l’article de référence, 12 à 600 caractères) dans chaque paire qui en manque.
3. Ajouter `image_url` HTTPS vérifiée dans `reference_article` et dans `pairs[].target_article` si une photo authentique est disponible.
4. Importer depuis l’accueil, vérifier l’aperçu, envoyer, puis approuver depuis un compte rédactionnel.
5. Le serveur doit réutiliser les articles et liaisons existants, conserver les votes, compléter les extraits manquants et les images uniquement lorsque `image_url IS NULL`.

**Prérequis :** migrations V1.0.46 et V1.0.47 et Edge Function correspondante déployées. Une nouvelle empreinte de document est nécessaire pour éviter la déduplication du dépôt initial. L’import réel doit être testé sur une base de test. Ne pas réimporter des citations non vérifiées.

**Attention au schéma historique :** un éventuel index unique par liaison dans `tm_article_excerpts` peut empêcher un deuxième extrait sur la même liaison. Vérifier les contraintes et index de cette table avant l’approbation ; ne pas supprimer les contraintes à l’aveugle.
