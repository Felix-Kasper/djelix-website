# DJELIX Website

Statische Seite ohne Build-Schritt, für GitHub Pages.

## Live stellen
1. GitHub Desktop: File → Add local repository → diesen Ordner → „create a repository“ → Commit → Publish.
2. github.com → Repo → Settings → Pages → Branch `main`, Ordner `/ (root)` → Save.

## Einmal einrichten: Formular
Anfragen und Liedwünsche laufen über FormSubmit an die Mail in `js/config.js`.
Nach der ersten Anfrage auf der echten Seite kommt eine Bestätigungsmail von FormSubmit. Link anklicken, erst dann kommen Anfragen an.
FormSubmit nennt dir danach eine Zufallsadresse. Die in `js/config.js` statt der Mail eintragen, dann steht deine Mail nicht mehr im öffentlichen Code.

## Pflegen (alles in `js/config.js`)
- Termine: `{ datum: '2026-12-19', ort: 'Sixty Twenty', stadt: 'Innsbruck' }`. Vergangene verschwinden von selbst.
- Instagram-Link, SoundCloud-Link.

## Vor dem Livegang
Impressum in `index.html` ergänzen (Suche nach `f-impressum`).

## Bilder
`assets/bilder/b01.jpg` bis `b10.jpg`, Logos in `assets/logos/` (weiß, durchsichtig). Neue Bilder: gleicher Dateiname reicht.
