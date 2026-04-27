# Genève – plan / 3D (ArcGIS) + terrasses SITG

Application Vite avec `@arcgis/core` : WebScene Genève, soleil / ombres, terrasses `VDG_TERRASSE_RESTO`, emprises approximatives.

## Développement local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173/`.

## Mettre sur GitHub et ouvrir depuis le web

1. Crée un dépôt vide sur GitHub (sans README si tu pousses déjà ce projet). Choisis un **nom sans espaces**, par ex. `geneve-ombres-sitg` — ce nom est utilisé dans l’URL Pages.

2. Dans ce dossier :

```bash
git init
git add .
git commit -m "Initial commit: Genève ArcGIS + SITG terrasses"
git branch -M main
git remote add origin https://github.com/TON_UTILISATEUR/NOM_DU_DEPOT.git
git push -u origin main
```

3. Active GitHub Pages : **Settings → Pages → Build and deployment → Source : GitHub Actions** (le workflow `.github/workflows/deploy-github-pages.yml` déploie automatiquement).

4. Après le premier workflow vert, le site sera disponible à :

   `https://TON_UTILISATEUR.github.io/NOM_DU_DEPOT/`

   (le segment après `.io/` doit être **exactement** le nom du dépôt, pour que les chemins des assets Vite correspondent au `BASE_PATH` utilisé au build).

## Build local comme sur GitHub Pages

Pour tester avec le même chemin de base que sur Pages :

```bash
BASE_PATH=/geneve-ombres-sitg/ npm run build && npm run preview -- --port 4173
```

Remplace `geneve-ombres-sitg` par le nom réel de ton dépôt.
