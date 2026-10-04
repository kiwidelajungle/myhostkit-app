<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=Codage_Site_MyHostKit.html">
<title>MyHostKit</title>
</head>
<body>
<script>window.location.replace('Codage_Site_MyHostKit.html');</script>
</body>
</html>

## Habillage Halloween (octobre 2026)

Deux fichiers de surcouche, `halloween.css` et `halloween.js`, chargés dans les 12 pages publiques (accueil, tarifs, marque-blanche, activer, telecharger, guides, logiciel-conciergerie, channel-manager, logiciel-location-saisonniere-agence, alternative-hostaway, alternative-smoobu, alternative-superhote). Ils redéfinissent les couleurs (or → citrouille, bleu nuit → violet nuit) et ajoutent toiles d'araignée, chauves-souris, fantôme et une pastille « Spécial Halloween » au-dessus du titre. Aucun texte ni prix n'est modifié.

Pour revenir au thème normal après le 31 octobre :

```bash
for f in *.html; do perl -0pi -e 's#\n<link rel="stylesheet" href="/halloween.css">##; s#\n<script src="/halloween.js" defer></script>##' "$f"; done
```
