# V1.0.46 — contrôles
- Vérification de syntaxe JavaScript : voir résultats de livraison.
- Ancien exemple BFMTV sans reference_excerpt : doit rester accepté.
- Nouvelle paire avec reference_excerpt valide : conservée par le validateur.
- Extrait de référence trop court : rejet.
- Rejet côté Edge Function si reference_excerpt invalide.
- Import SQL réel, RLS, transactions et affichage navigateur : à valider sur base de test, non exécutés ici.
- Attention : l'ancien fichier BFMTV ne contient pas les extraits BFMTV, qui ne peuvent pas être reconstruits automatiquement.
