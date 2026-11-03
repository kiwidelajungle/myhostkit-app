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

## Habillage de Noël (novembre-décembre 2026)

Deux fichiers de surcouche, `noel.css` et `noel.js`, chargés dans les 45 pages publiques : guirlande lumineuse en haut de l'écran (s'efface au défilement), neige légère (aucune si l'utilisateur a réduit les animations), sapin à côté du logo, et l'offre de Noël : pastille avec le code et un compte à rebours au-dessus du titre, encart avec le code sur /activer. Offre : code promo NOEL, -50 % pendant 2 mois, jusqu'au 31 décembre 2026 23 h 59 (Paris), objet `OFFER` dans `noel.js` ; elle s'efface seule après l'échéance et la pastille redevient « Joyeuses fêtes ». La remise réelle est portée par un coupon Stripe (2 mois répétitifs : il n'y a plus d'essai côté Stripe), créé à la main.

Pour revenir au thème normal après les fêtes :

```bash
for f in *.html; do perl -0pi -e 's#\n<link rel="stylesheet" href="/noel.css">##; s#\n<script src="/noel.js" defer></script>##' "$f"; done
```

## Habillage Halloween (octobre 2026)

Deux fichiers de surcouche, `halloween.css` et `halloween.js`, chargés dans les 12 pages publiques (accueil, tarifs, marque-blanche, activer, telecharger, guides, logiciel-conciergerie, channel-manager, logiciel-location-saisonniere-agence, alternative-hostaway, alternative-smoobu, alternative-superhote). Ils redéfinissent les couleurs (or → citrouille, bleu nuit → violet nuit) et ajoutent toiles d'araignée, chauves-souris, fantôme et une pastille « Spécial Halloween » au-dessus du titre. Aucun texte ni prix n'est modifié dans les pages. L'offre Halloween (code promo HALLOWEEN, -50 % pendant 2 mois, échéance 1er novembre 2026 23 h 59 Paris) est définie dans `halloween.js` (objet `OFFER`) : pastille avec compte à rebours au-dessus du titre, encart avec le code sur /activer. Elle s'efface seule après l'échéance ; la remise réelle est portée par un coupon Stripe que le code ne crée pas.

Pour revenir au thème normal après le 31 octobre :

```bash
for f in *.html; do perl -0pi -e 's#\n<link rel="stylesheet" href="/halloween.css">##; s#\n<script src="/halloween.js" defer></script>##' "$f"; done
```
