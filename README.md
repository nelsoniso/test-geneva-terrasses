# Genève – plan / 3D (ArcGIS) + terrasses SITG

Application Vite avec `@arcgis/core` : WebScene Genève, soleil / ombres, terrasses `VDG_TERRASSE_RESTO`, emprises approximatives.

**Dépôt :** https://github.com/nelsoniso/geneve-ombres-sitg  

**Site publié (GitHub Pages), une fois le déploiement OK :** https://nelsoniso.github.io/geneve-ombres-sitg/

### Si tu vois « 404 · There isn't a GitHub Pages site here »

1. **Réglages du dépôt** → **Pages** → **Build and deployment** → **Source** doit être **GitHub Actions** (pas « Deploy from a branch »).
2. **Réglages** → **Actions** → **General** → **Workflow permissions** → coche **Read and write permissions** puis **Save**.
3. Onglet **Actions** : ouvre **Deploy to GitHub Pages**. Si une ligne est rouge, ouvre-la et lis l’erreur (souvent build npm ou première approbation de l’environnement « github-pages »).
4. **Dépôt public** : avec un compte gratuit, Pages pour un dépôt **privé** peut être bloqué ou limité ; en cas de doute, passe le dépôt en **public** (**Settings → General → Danger zone → Change repository visibility**).
5. Déclenche à nouveau un déploiement : bouton **Run workflow** sur le workflow (ou petit commit + `git push`), puis attends 1–3 minutes et réessaie l’URL.

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
