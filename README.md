# Genève – plan / 3D (ArcGIS) + terrasses SITG

Application Vite avec `@arcgis/core` : WebScene Genève, soleil / ombres, terrasses `VDG_TERRASSE_RESTO`, emprises approximatives.

**Dépôt :** https://github.com/nelsoniso/geneve-ombres-sitg  

**Site publié (GitHub Pages), après activation du workflow :** https://nelsoniso.github.io/geneve-ombres-sitg/

## Développement local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173/`.

## Pousser le code vers GitHub

Si le dépôt existe déjà mais ce clone n’a pas de `remote` :

```bash
git remote add origin https://github.com/nelsoniso/geneve-ombres-sitg.git
git push -u origin main
```

Pages : **Settings → Pages → Source : GitHub Actions**. Le workflow `.github/workflows/deploy-github-pages.yml` construit avec `BASE_PATH=/geneve-ombres-sitg/`.

## Build local comme sur GitHub Pages

```bash
BASE_PATH=/geneve-ombres-sitg/ npm run build && npm run preview -- --port 4173
```
