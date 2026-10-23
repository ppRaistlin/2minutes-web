# V1.0.45 — affichage bidirectionnel des passages

- BFMTV → LCP/RTL : passage lié affiché avec `excerpt_origin=editorial`.
- LCP/RTL → BFMTV : passage source affiché avec `source_origin=editorial`, sans message trompeur « Aucun passage sélectionné pour cet article lié ».
- Deux passages : affichage des deux, chacun avec sa propre origine.
- Aucun passage : message neutre.
- Aucune migration ni écriture Supabase.
- Les passages BFMTV absents de la base ne sont pas inventés.

Vérification statique et syntaxique réalisée ; recette navigateur/Supabase à effectuer.
