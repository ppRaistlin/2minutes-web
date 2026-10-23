# V1.0.47 — vérifications
- Syntaxe JS et TS statique : voir livraison.
- Format ancien : reste valide sans `reference_excerpt` ni `image_url`.
- Images : champ optionnel, HTTPS obligatoire, longueur <= 2000.
- SQL : migration manuelle, transaction réelle non exécutée.
- Images d’articles existants : mise à jour uniquement si `image_url IS NULL`.
- Affichage navigateur et import Supabase : à valider après déploiement.
