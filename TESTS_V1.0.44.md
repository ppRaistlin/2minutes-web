# Tests V1.0.44 — statut

| Test | Résultat |
| --- | --- |
| Validateur BFMTV + 12 rejets (V1.0.43 conservés) | 13/13 PASS |
| Chiffrement AES-GCM 256 avec enveloppe RSA-OAEP 3072 | PASS local Node |
| Déchiffrement BFMTV avec clé privée séparée | PASS local Node |
| SHA-256 du document déchiffré | PASS local Node |
| Altération du chiffré rejetée par AES-GCM | PASS local Node |
| Interface, fichier BFMTV (LCP et RTL), desktop | PASS Chromium local (DOM simulé) |
| Interface, fichier BFMTV (LCP et RTL), mobile | PASS Chromium local (DOM simulé) |
| Fichier JSON invalide rejeté, desktop et mobile | PASS Chromium local |
| Dépôt accessible sans compte | PASS Chromium local |
| Bouton désactivé avant confirmation | PASS Chromium local |
| Contrôle syntaxique JS et TypeScript Edge | PASS (`node --check` et `tsc --noEmit`) |
| Installation SQL sur une vraie instance Supabase | NON EXÉCUTÉ |
| Appel réseau réel à l'Edge Function | NON EXÉCUTÉ (non déployée) |
| Autorisation de revue, quota, idempotence et transaction SQL réels | NON EXÉCUTÉ |

La validation locale de la **structure** du fichier ne garantit pas que les citations sont authentiques ou que le fichier vient réellement du Wizard. La revue rédactionnelle est obligatoire avant toute publication.
