import esriConfig from "@arcgis/core/config";
import WebScene from "@arcgis/core/WebScene";
import SceneView from "@arcgis/core/views/SceneView";
import Camera from "@arcgis/core/Camera";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import Polygon from "@arcgis/core/geometry/Polygon";
import Extent from "@arcgis/core/geometry/Extent";
import { distance as geDistance } from "@arcgis/core/geometry/geometryEngine";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D";
import ObjectSymbol3DLayer from "@arcgis/core/symbols/ObjectSymbol3DLayer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import { load, project } from "@arcgis/core/geometry/projection";

import "./main-scene.css";
import "@arcgis/core/assets/esri/themes/light/main.css";

/** Affiché sur GitHub Pages pour confirmer quel build est servi (see CI VITE_APP_SHA). */
function showBuildStamp(): void {
  const sha = import.meta.env.VITE_APP_SHA as string | undefined;
  const el = document.getElementById("build-stamp");
  if (!el) {
    return;
  }
  el.textContent = sha?.trim()
    ? `Build déployé : ${sha.trim().slice(0, 7)} — même app que ce dossier (ArcGIS + terrasses rouges SITG).`
    : "Local (npm run dev) — ArcGIS + terrasses SITG.";
}

showBuildStamp();

esriConfig.assetsPath = "https://js.arcgis.com/4.31/@arcgis/core/assets";

/** Même scène 3D que le viewer : https://www.arcgis.com/home/webscene/viewer.html?webscene=9a34eb6038414a7984e91a8aef834b1a */
const GENEVE_WEBSCENE_ID = "9a34eb6038414a7984e91a8aef834b1a";

const scene = new WebScene({
  portalItem: {
    id: GENEVE_WEBSCENE_ID
  }
});

const view = new SceneView({
  container: "viewDiv",
  map: scene,
  qualityProfile: "low"
});

const dateIn = () => document.getElementById("date") as HTMLInputElement;
const timeSlider = () => document.getElementById("time-slider") as HTMLInputElement;
const timeOutEl = () => document.getElementById("time-slider-out") as HTMLOutputElement;
const timeHidden = () => document.getElementById("time") as HTMLInputElement;
const shadowCb = () => document.getElementById("shadows") as HTMLInputElement;

const GENEVE_LON = 6.1432;
const GENEVE_LAT = 46.2044;
const PLAN_CAM_HEIGHT_M = 4800;
const D3_TILT = 62;
const D3_CAM_HEIGHT_M = 900;

let is3DMode = false;

function minutesOfDayFromSlider(): number {
  return Math.min(1439, Math.max(0, parseInt(timeSlider().value, 10) || 0));
}

function updateTimeOutLabel(): void {
  const mins = minutesOfDayFromSlider();
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const s = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  timeOutEl().value = s;
  timeHidden().value = s;
}

function getSunDate(): Date {
  const d = dateIn().value;
  if (!d) {
    return new Date();
  }
  const mins = minutesOfDayFromSlider();
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return new Date(
    `${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
  );
}

function fillFormFromDate(sun: Date): void {
  const pad = (n: number) => String(n).padStart(2, "0");
  dateIn().value = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`;
  const mins = sun.getHours() * 60 + sun.getMinutes();
  timeSlider().value = String(mins);
  updateTimeOutLabel();
}

function applySunLighting(): void {
  const when = getSunDate();
  const shadows = shadowCb().checked;
  view.environment.lighting = {
    type: "sun",
    date: when,
    directShadowsEnabled: shadows
  };
}

function getGroundCenterInMapScale(): { x: number; y: number; span: number } {
  const ext = view.extent;
  const mapSr = scene.spatialReference!;
  if (ext) {
    const w = ext.width;
    const h = ext.height;
    return {
      x: (ext.xmin + ext.xmax) / 2,
      y: (ext.ymin + ext.ymax) / 2,
      span: Math.max(w, h) || 8000
    };
  }
  const p = new Point({
    latitude: GENEVE_LAT,
    longitude: GENEVE_LON,
    spatialReference: SpatialReference.WGS84
  });
  const g = project(p, mapSr) as __esri.Point;
  return { x: g.x, y: g.y, span: 12000 };
}

async function goToPlanView(): Promise<void> {
  await load();
  const { x, y, span } = getGroundCenterInMapScale();
  const mapSr = scene.spatialReference!;
  const z = Math.min(12_000, Math.max(PLAN_CAM_HEIGHT_M, span * 0.9));
  const cam = new Camera({
    position: { x, y, z, spatialReference: mapSr },
    heading: 0,
    tilt: 0
  });
  await view.goTo(cam, { duration: 450, easing: "in-out-cubic" });
}

async function goTo3DView(): Promise<void> {
  await load();
  const { x, y } = getGroundCenterInMapScale();
  const mapSr = scene.spatialReference!;
  const cam = new Camera({
    position: { x, y, z: D3_CAM_HEIGHT_M, spatialReference: mapSr },
    heading: 0,
    tilt: D3_TILT
  });
  await view.goTo(cam, { duration: 550, easing: "in-out-cubic" });
}

async function applyViewMode(three: boolean): Promise<void> {
  is3DMode = three;
  const btn = document.getElementById("toggle-3d");
  const label = document.getElementById("view-mode-label");
  if (three) {
    view.qualityProfile = "high";
    view.constraints.tilt.max = 85;
    view.constraints.tilt.mode = "auto";
    if (btn) {
      btn.textContent = "Vue plan (dessus)";
    }
    if (label) {
      label.textContent = "Mode 3D (oblique) — ombres actives";
    }
    await goTo3DView();
  } else {
    view.qualityProfile = "low";
    view.constraints.tilt.max = 0.5;
    view.constraints.tilt.mode = "manual";
    if (btn) {
      btn.textContent = "Vue 3D (navigation oblique)";
    }
    if (label) {
      label.textContent = "Mode plan (vue du dessus) — ombres actives";
    }
    await goToPlanView();
  }
}

const overlay = new GraphicsLayer({ title: "Exemples ajoutés par l’appli" });
scene.add(overlay);

/** SITG — terrasses recensées par la Ville de Genève (points LV95, CH1903+). */
const SITG_TERRASSES_URL =
  "https://vector.sitg.ge.ch/arcgis/rest/services/VDG_TERRASSE_RESTO/FeatureServer/0";

/** Emprises de bâtiments (polygones LV95) — pour l’alignement arête la plus proche du point. */
const SITG_AGGLO_RTGE_BATIMENT_URL =
  "https://vector.sitg.ge.ch/arcgis/rest/services/AGGLO_RTGE_BATIMENT/FeatureServer/0";

let terrasseLayer: FeatureLayer | null = null;
/** Sous-couches : FeatureLayer (disques) + GraphicsLayer (cadre rect. polyline) — ne pas lire .graphics. */
let terrasseRectLayer: GroupLayer | null = null;
let terrasseLoadStats: { total: number; single: number } | null = null;

const terrassePopup = new PopupTemplate({
  title: "{NOM_CAFE}",
  content: [
    {
      type: "text",
      text:
        "<p><b>Adresse</b><br/>{LIEU} {NUMERO}<br/>Ville de Genève (CH) &mdash; champs SITG <i>LIEU</i> + <i>NUMERO</i>.</p>"
    },
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "LIEU", label: "Lieu (rue / voie)" },
        { fieldName: "NUMERO", label: "N° municipal" },
        { fieldName: "NO_TERRASSE", label: "N° de dossier terrasse" },
        { fieldName: "OBJET", label: "Type" },
        { fieldName: "PERIODE", label: "Période" },
        { fieldName: "LARGEUR", label: "Largeur (m) — SITG" },
        { fieldName: "LONGUEUR", label: "Longueur (m) — SITG" },
        { fieldName: "SURFACE", label: "Surface (m²) — SITG" },
        { fieldName: "RIVE", label: "Rive" }
      ]
    },
    {
      type: "text",
      text:
        "<p><b>Emprise affichée (approx.)</b><br/>" +
        "Le <b>disque rouge</b> (aire ≈ L×LARGEUR) est <b>drapé sur le MNT</b> (vue de dessus : peinture au sol) ; " +
        "le <b>cadre</b> suit le rectangle SITG (bâti si possible). Les losanges verts restent légèrement surélevés.<br/>" +
        "L’<b>orientation</b> du plus grand côté suit, quand c’est possible, l’<b>arête de l’emprise bâtie</b> " +
        "la plus proche (couche SITG <i>AGGLO_RTGE_BATIMENT</i>, LV95) — <i>heuristique de façade côté rue</i>. " +
        "Sinon, cap <b>est–ouest</b> par défaut. Le maillage 3D des bâtiments dans la scène est indépendant de ce socle 2D : l’alignement vient de l’emprise polygonale SITG.</p>"
    }
  ],
  footer: `<a href="https://sitg.ge.ch/donnees/vdg-terrasse-resto" target="_blank" rel="noopener">Fiche SITG VDG_TERRASSE_RESTO</a>`
});

const terrasseRenderer = new SimpleRenderer({
  symbol: new SimpleMarkerSymbol({
    style: "diamond",
    size: 12,
    color: [0, 130, 75, 0.95],
    outline: { color: [255, 255, 255, 0.95], width: 1.1 }
  })
});

/**
 * Emprise au sol : en « relative to ground » à 0,15 m le disque z-fightait le MNT et devenait invisible en vue
 * du dessus. En mode on-the-ground le polygone est drapé sur le MNT (comme l’infrastructure routière) : visible
 * en top view. Les marqueurs restent en relative+2,5 m, donc au-dessus de ce drapé.
 */
const TERRASSE_POI_ELEV_M = 2.5;
/** Disque d’emprise (aire L×l) : rouge vif, lisible en vue aérienne. */
const terrasseEmpriseRedFill = new SimpleFillSymbol({
  color: [255, 0, 0, 0.92],
  outline: { color: [150, 0, 0, 1], style: "solid", width: 1.2 }
});
/** Contour L×l SITG (drapé, même calque). */
const terrasseEmpriseRectFrame = new SimpleLineSymbol({
  color: [100, 0, 0, 1],
  width: 2.25,
  cap: "round",
  join: "miter"
});

/**
 * Cap du **grand côté** (horloger depuis le nord) en degrés — repli si aucune emprise bâti SITG trouvée à proximité.
 */
const TERRASSE_LONG_BEAR_DEG = 90;

/** Regroupement spatial des requêtes emprises (m, LV95). */
const TERRASSE_BATI_GRID_M = 220;
const TERRASSE_BATI_QUERY_PAD_M = 65;
/** Distance max point → polygone bâti pour considérer l’alignement (m). */
const TERRASSE_BATI_MAX_DIST_M = 52;
const TERRASSE_BATI_QUERY_BATCH = 6;

function parseNumM(v: unknown): number {
  if (v == null || v === "") {
    return Number.NaN;
  }
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : Number.NaN;
}

function parseTerrasseDimensions(a: Record<string, unknown> | undefined | null): {
  longM: number;
  shortM: number;
} | null {
  if (!a) {
    return null;
  }
  const la = parseNumM(a.LARGEUR);
  const lo = parseNumM(a.LONGUEUR);
  if (Number.isFinite(la) && Number.isFinite(lo) && la > 0.15 && lo > 0.15) {
    return { longM: Math.max(la, lo), shortM: Math.min(la, lo) };
  }
  const s = parseNumM(a.SURFACE);
  if (Number.isFinite(s) && s > 0.1) {
    const d = Math.sqrt(s);
    return { longM: d, shortM: d };
  }
  return null;
}

/**
 * Rectangle centré sur le point SITG (LV95, m) ; le grand côté est à `bearing` degrés depuis le nord (horloger).
 * Vecteur unitaire du long côté : (sin(bearing), cos(bearing)) en (E, N) ≈ (x, y) LV95.
 */
function buildTerrasseRectangleMeters(
  center: __esri.Point,
  longM: number,
  shortM: number,
  bearingFromNorthClockwiseDeg: number
): Polygon | null {
  const hL = longM / 2;
  const hW = shortM / 2;
  if (hL < 0.1 || hW < 0.1) {
    return null;
  }
  const cx = center.x;
  const cy = center.y;
  const br = (bearingFromNorthClockwiseDeg * Math.PI) / 180;
  const ux = Math.sin(br);
  const uy = Math.cos(br);
  const perpE = -uy;
  const perpN = ux;
  const corners: [number, number][] = [
    [cx - ux * hL - perpE * hW, cy - uy * hL - perpN * hW],
    [cx + ux * hL - perpE * hW, cy + uy * hL - perpN * hW],
    [cx + ux * hL + perpE * hW, cy + uy * hL + perpN * hW],
    [cx - ux * hL + perpE * hW, cy - uy * hL + perpN * hW]
  ];
  // Inverser le parcour pour orienter l’extérieur du polygone « vers le ciel » (évite le culling négatif en 3D).
  const rev = corners.slice().reverse() as [number, number][];
  const r: [number, number][] = [...rev, rev[0]!];
  return new Polygon({ rings: [r], spatialReference: center.spatialReference });
}

/** Contour fermé (polyline) : visible même quand le remplissage est masqué par le depth buffer. */
function rectangleBoundaryPolyline(polygon: Polygon): Polyline | null {
  const ring = polygon.rings[0];
  if (!ring || ring.length < 2) {
    return null;
  }
  const path: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    path.push([ring[i]![0]!, ring[i]![1]!]);
  }
  if (path.length < 2) {
    return null;
  }
  const a = path[0]!;
  const b = path[path.length - 1]!;
  if (a[0] !== b[0] || a[1] !== b[1]) {
    path.push(a);
  }
  return new Polyline({
    paths: [path],
    spatialReference: polygon.spatialReference
  });
}

/** Rayon d’un disque d’aire ≈ celle du rectangle (L×l) — le buffer se voit mieux en 3D qu’un plafond rect. */
function terrasseDiscRadiusMeters(longM: number, shortM: number): number {
  const r = Math.sqrt(Math.max(longM * shortM, 0.1) / Math.PI);
  return Math.max(r, 2.5);
}

/**
 * Cercle en LV95 (m) — évite buffer() qui en WebScene a souvent 0 aire en sortie côté client.
 * t = 0 pointe vers l’est : x+ = E, y+ = N.
 */
function discPolygonMeters(
  p: __esri.Point,
  radiusM: number,
  steps = 48
): Polygon {
  const path: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    path.push([p.x + radiusM * Math.cos(t), p.y + radiusM * Math.sin(t)]);
  }
  return new Polygon({ rings: [path], spatialReference: p.spatialReference });
}

/**
 * Bord le plus proche du point = arête de « façade » approximative ; le grand côté du rectangle lui est parallèle.
 * Cap horloger depuis le nord, LV95 (E,N) ≈ (x,y) : (sin, cos) dans buildTerrasseRectangleMeters.
 */
function facadeEdgeBearingDegFromPoint(pt: __esri.Point, poly: Polygon): number | null {
  const ring = poly.rings[0];
  if (!ring || ring.length < 2) {
    return null;
  }
  const sr = poly.spatialReference;
  const last = ring.length - 1;
  const hasClose = ring[0][0] === ring[last][0] && ring[0][1] === ring[last][1];
  const nEdge = hasClose ? last : ring.length - 1;
  let bestD = Infinity;
  let bestAtan = TERRASSE_LONG_BEAR_DEG;
  for (let i = 0; i < nEdge; i++) {
    const ax = ring[i][0];
    const ay = ring[i][1];
    const bx = ring[i + 1][0];
    const by = ring[i + 1][1];
    const seg = new Polyline({
      paths: [
        [
          [ax, ay],
          [bx, by]
        ]
      ],
      spatialReference: sr
    });
    const d = geDistance(pt, seg);
    if (d < bestD) {
      bestD = d;
      const dx = bx - ax;
      const dy = by - ay;
      if (Math.hypot(dx, dy) > 0.04) {
        bestAtan = (Math.atan2(dx, dy) * 180) / Math.PI;
      }
    }
  }
  if (!Number.isFinite(bestD) || bestD > 400) {
    return null;
  }
  return bestAtan;
}

function pickNearestBuildingPolygon(
  point: __esri.Point,
  candidates: __esri.Graphic[]
): Polygon | null {
  let best: Polygon | null = null;
  let bestD = TERRASSE_BATI_MAX_DIST_M;
  for (const f of candidates) {
    if (!f.geometry || f.geometry.type !== "polygon") {
      continue;
    }
    const pl = f.geometry as Polygon;
    const d = geDistance(point, pl);
    if (d < bestD) {
      bestD = d;
      best = pl;
    }
  }
  return best;
}

function gridKeyForPoint(p: __esri.Point): string {
  return `${Math.floor(p.x / TERRASSE_BATI_GRID_M)}|${Math.floor(p.y / TERRASSE_BATI_GRID_M)}`;
}

function extentAroundGraphics(graphs: __esri.Graphic[], padM: number): Extent | null {
  const pts: __esri.Point[] = [];
  for (const g of graphs) {
    if (g.geometry && g.geometry.type === "point") {
      pts.push(g.geometry as __esri.Point);
    }
  }
  if (pts.length === 0) {
    return null;
  }
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const p of pts) {
    xmin = Math.min(xmin, p.x);
    ymin = Math.min(ymin, p.y);
    xmax = Math.max(xmax, p.x);
    ymax = Math.max(ymax, p.y);
  }
  return new Extent({
    xmin: xmin - padM,
    ymin: ymin - padM,
    xmax: xmax + padM,
    ymax: ymax + padM,
    spatialReference: pts[0].spatialReference
  });
}

function bearingForTerrassePoint(
  point: __esri.Point,
  buildingsInArea: __esri.Graphic[]
): { deg: number; fromBuilding: boolean } {
  const poly = pickNearestBuildingPolygon(point, buildingsInArea);
  if (!poly) {
    return { deg: TERRASSE_LONG_BEAR_DEG, fromBuilding: false };
  }
  const edge = facadeEdgeBearingDegFromPoint(point, poly);
  if (edge == null) {
    return { deg: TERRASSE_LONG_BEAR_DEG, fromBuilding: false };
  }
  return { deg: edge, fromBuilding: true };
}

function appendEmpriseDiscAndRim(
  polyGraphics: Graphic[],
  rimGL: GraphicsLayer,
  point: __esri.Point,
  d: { longM: number; shortM: number },
  bearingDeg: number,
  baseAttr: Record<string, unknown>,
  objectId: number
): void {
  const r = terrasseDiscRadiusMeters(d.longM, d.shortM);
  const disc = discPolygonMeters(point, r);
  polyGraphics.push(
    new Graphic({
      geometry: disc,
      attributes: { ...baseAttr, OBJECTID: objectId }
    })
  );
  const rect = buildTerrasseRectangleMeters(point, d.longM, d.shortM, bearingDeg);
  if (!rect) {
    return;
  }
  const frame = rectangleBoundaryPolyline(rect);
  if (frame) {
    rimGL.add(
      new Graphic({
        geometry: frame,
        symbol: terrasseEmpriseRectFrame,
        attributes: baseAttr,
        popupTemplate: terrassePopup
      })
    );
  }
}

async function buildTerrasseRectLayer(
  uniques: __esri.Graphic[],
  batiLayer: FeatureLayer | null,
  sitgFieldTemplate: FeatureLayer
): Promise<GroupLayer> {
  const withDim = uniques.filter((g) => g.attributes && parseTerrasseDimensions(g.attributes));
  const emptyGroup = new GroupLayer({
    title: "Emprise terrasses (drapage MNT + disques SITG)",
    listMode: "show"
  });
  if (withDim.length === 0) {
    return emptyGroup;
  }
  const polyGraphics: Graphic[] = [];
  const rimGL = new GraphicsLayer({
    title: "Cadre L×l (SITG)",
    listMode: "show",
    elevationInfo: { mode: "on-the-ground" }
  });
  let empriseObjectId = 1;

  if (batiLayer == null) {
    for (const g of withDim) {
      const p = g.geometry as __esri.Point;
      const a = g.attributes!;
      const d = parseTerrasseDimensions(a);
      if (!d) {
        continue;
      }
      const att = a as Record<string, unknown>;
      const attrEmprise = {
        ...att,
        TERR_BEAR: TERRASSE_LONG_BEAR_DEG,
        TERR_ORI: "Est–Ouest (défaut)"
      };
      appendEmpriseDiscAndRim(
        polyGraphics,
        rimGL,
        p,
        d,
        TERRASSE_LONG_BEAR_DEG,
        attrEmprise,
        empriseObjectId++
      );
    }
  } else {
    const byGrid = new Map<string, __esri.Graphic[]>();
    for (const g of withDim) {
      const p = g.geometry;
      if (!p || p.type !== "point") {
        continue;
      }
      const k = gridKeyForPoint(p as __esri.Point);
      if (!byGrid.has(k)) {
        byGrid.set(k, []);
      }
      byGrid.get(k)!.push(g);
    }
    const keyToBati = new Map<string, __esri.Graphic[]>();
    const groupEntries = [...byGrid.entries()];
    for (let i = 0; i < groupEntries.length; i += TERRASSE_BATI_QUERY_BATCH) {
      const chunk = groupEntries.slice(i, i + TERRASSE_BATI_QUERY_BATCH);
      await Promise.all(
        chunk.map(async ([k, items]) => {
          const env = extentAroundGraphics(items, TERRASSE_BATI_QUERY_PAD_M);
          if (!env) {
            keyToBati.set(k, []);
            return;
          }
          try {
            const r = await batiLayer.queryFeatures({
              geometry: env,
              spatialRel: "esriSpatialRelIntersects",
              returnGeometry: true,
              outFields: ["OBJECTID"],
              num: 8000
            });
            keyToBati.set(k, r.features || []);
          } catch (e) {
            keyToBati.set(k, []);
            if (import.meta.env.DEV) {
              console.warn("Requête emprise bâti (grille) échouée, repli E–O pour ce paquet.", e);
            }
          }
        })
      );
    }
    for (const g of withDim) {
      const p = g.geometry as __esri.Point;
      const a = g.attributes;
      if (!a) {
        continue;
      }
      const d2 = parseTerrasseDimensions(a);
      if (!d2) {
        continue;
      }
      const k = gridKeyForPoint(p);
      const bati = keyToBati.get(k) || [];
      const { deg, fromBuilding } = bearingForTerrassePoint(p, bati);
      const att = a as Record<string, unknown>;
      const ori = fromBuilding
        ? "Arête bâti SITG (AGGLO_RTGE) la plus proche du point"
        : "Est–Ouest (défaut — pas d’emprise bâti assez proche)";
      const attrEmprise = {
        ...att,
        TERR_BEAR: Math.round(deg * 10) / 10,
        TERR_ORI: ori
      };
      appendEmpriseDiscAndRim(
        polyGraphics,
        rimGL,
        p,
        d2,
        deg,
        attrEmprise,
        empriseObjectId++
      );
    }
  }
  if (polyGraphics.length === 0) {
    return emptyGroup;
  }
  const fl = new FeatureLayer({
    id: "sitg-terrasse-emprise-disques",
    title: "Disque aire (drapage MNT)",
    objectIdField: "OBJECTID",
    geometryType: "polygon",
    fields: sitgFieldTemplate.fields,
    source: polyGraphics,
    spatialReference: sitgFieldTemplate.spatialReference!,
    renderer: new SimpleRenderer({ symbol: terrasseEmpriseRedFill }),
    popupTemplate: terrassePopup,
    elevationInfo: { mode: "on-the-ground" },
    outFields: ["*"],
    listMode: "show"
  });
  return new GroupLayer({
    title: "Emprise terrasses (drapage MNT + disques SITG)",
    listMode: "show",
    layers: [fl, rimGL]
  });
}

function normText(v: unknown): string {
  if (v == null) {
    return "";
  }
  return String(v)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Regroupe par établissement + adresse (évite les 2–3 points identiques côté SITG pour le même bar). */
function terrasseDedupKey(gra: __esri.Graphic): string {
  const a = gra.attributes;
  if (!a) {
    return `id:${String(gra.uid)}`;
  }
  const name = normText(a.NOM_CAFE);
  const lieu = normText(a.LIEU);
  const num = String(a.NUMERO ?? "")
    .trim()
    .toLowerCase();
  if (!name && !lieu) {
    return `oid:${a.OBJECTID}`;
  }
  return `${name}|${lieu}|${num}`;
}

function surfaceM2(gra: __esri.Graphic): number {
  const s = gra.attributes?.SURFACE;
  if (typeof s === "number" && !Number.isNaN(s)) {
    return s;
  }
  const p = parseFloat(String(s));
  return Number.isNaN(p) ? 0 : p;
}

function pickRichest(gra: __esri.Graphic, g2: __esri.Graphic): __esri.Graphic {
  return surfaceM2(gra) >= surfaceM2(g2) ? gra : g2;
}

function dedupeTerrasseGraphics(features: __esri.Graphic[]): {
  out: __esri.Graphic[];
  removed: number;
} {
  const m = new Map<string, __esri.Graphic>();
  for (const f of features) {
    const k = terrasseDedupKey(f);
    const e = m.get(k);
    m.set(k, e ? pickRichest(e, f) : f);
  }
  const out = [...m.values()];
  return { out, removed: features.length - out.length };
}

async function queryAllTerrasseFeatures(svc: FeatureLayer): Promise<__esri.Graphic[]> {
  const acc: __esri.Graphic[] = [];
  let start = 0;
  const num = 2000;
  for (;;) {
    const r = await svc.queryFeatures({
      where: "1=1",
      returnGeometry: true,
      outFields: ["*"],
      start,
      num
    });
    const feat = r.features;
    if (feat?.length) {
      acc.push(...feat);
    }
    if (!r.exceededTransferLimit && (feat == null || feat.length < num)) {
      break;
    }
    if (feat == null || feat.length === 0) {
      break;
    }
    start += feat.length;
    if (start > 20_000) {
      break;
    }
  }
  return acc;
}

async function buildTerrasseLayerDeduped(): Promise<FeatureLayer> {
  const src = new FeatureLayer({ url: SITG_TERRASSES_URL, outFields: ["*"] });
  await src.load();
  const all = await queryAllTerrasseFeatures(src);
  const { out: uniques, removed } = dedupeTerrasseGraphics(all);
  uniques.forEach((g, i) => {
    if (g.attributes) {
      g.attributes = { ...g.attributes, OBJECTID: i + 1 };
    }
  });
  terrasseLoadStats = { total: all.length, single: uniques.length };
  let batiEmprises: FeatureLayer | null = null;
  try {
    batiEmprises = new FeatureLayer({
      url: SITG_AGGLO_RTGE_BATIMENT_URL,
      outFields: ["OBJECTID"]
    });
    await batiEmprises.load();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("SITG AGGLO_RTGE_BATIMENT indisponible — emprises terrasse en cap est-ouest par défaut.", e);
    }
  }
  terrasseRectLayer = await buildTerrasseRectLayer(uniques, batiEmprises, src);
  if (import.meta.env.DEV && terrasseRectLayer) {
    const el0 = terrasseRectLayer.layers.getItemAt(0) as __esri.FeatureLayer | null;
    const nDiscs = el0?.source ? el0.source.length : 0;
    console.info(
      `SITG terrasses: ${all.length} en base → ${uniques.length} point(s) (${removed} doublon(s)) ; emprise: ${nDiscs} disque(s) rouge(s) (FeatureLayer drapé) + cadres.`
    );
  }
  return new FeatureLayer({
    id: "terrasses-sitg-dedup",
    title: "Terrasses (SITG, 1 point par établissement + lieu + n° — plus grande surface si doublon)",
    source: uniques,
    objectIdField: "OBJECTID",
    geometryType: "point",
    spatialReference: src.spatialReference!,
    fields: src.fields,
    outFields: ["*"],
    renderer: terrasseRenderer,
    popupTemplate: terrassePopup,
    /** Sol / piéton (MNT), pas sur les toits des bâtiments 3D — léger offset pour le rendu. */
    elevationInfo: { mode: "relative-to-ground", offset: TERRASSE_POI_ELEV_M },
    screenSizePerspectiveEnabled: true
  });
}

function setTerrassePoiStatus(visible: boolean): void {
  const el = document.getElementById("poi-status");
  if (!el) {
    return;
  }
  if (visible) {
    let extra = " Chargement…";
    if (terrasseLoadStats) {
      const d = terrasseLoadStats.total - terrasseLoadStats.single;
      extra =
        d > 0
          ? ` — <strong>${terrasseLoadStats.single}</strong> point(s) affiché(s) (≈${d} enregistrement(s) en double regroupé(s) : même <em>nom de café + lieu + n° de rue</em>, on garde la plus grande surface).`
          : ` — ${terrasseLoadStats.single} point(s) (aucun doublon regroupable détecté).`;
    }
    el.innerHTML =
      'Points&nbsp;: <a href="https://sitg.ge.ch/donnees/vdg-terrasse-resto" target="_blank" rel="noopener">VDG_TERRASSE_RESTO</a> (SITG) — établissements avec terrasse autorisée.' +
      extra +
      ' <span class="poi-hint">Cliquez un point pour le détail.</span>';
  } else {
    el.textContent = "Calque des terrasses masqué (données SITG).";
  }
}

/** Point de démonstration près du centre de Genève (WGS84) – projeté en SVY21 si la scène l’exige. */
function makeDemoPoint(): Point {
  return new Point({
    x: 6.1432,
    y: 46.2044,
    z: 450,
    spatialReference: { wkid: 4326 }
  });
}

void scene
  .load()
  .then(() => load())
  .then(() => {
    const demo = new Graphic({
      symbol: new PointSymbol3D({
        symbolLayers: [
          new ObjectSymbol3DLayer({
            width: 18,
            height: 18,
            depth: 18,
            resource: { primitive: "sphere" },
            material: { color: [220, 50, 50, 0.95] }
          })
        ]
      })
    });
    const g = project(makeDemoPoint(), scene.spatialReference!);
    if (g) {
      demo.geometry = g;
      overlay.add(demo);
    }
  })
  .catch((err) => {
    console.error(err);
    alert("Impossible de charger la scène. Vérifiez la connexion et l’ID du portail.");
  });

view
  .when()
  .then(async () => {
    view.popupEnabled = true;
    const now = new Date();
    fillFormFromDate(now);
    updateTimeOutLabel();
    applySunLighting();
    for (const el of [dateIn(), timeSlider(), shadowCb()]) {
      el.addEventListener("input", () => {
        if (el === timeSlider()) {
          updateTimeOutLabel();
        }
        applySunLighting();
      });
      el.addEventListener("change", () => {
        if (el === timeSlider()) {
          updateTimeOutLabel();
        }
        applySunLighting();
      });
    }
    const btn = document.getElementById("now");
    btn?.addEventListener("click", () => {
      fillFormFromDate(new Date());
      updateTimeOutLabel();
      applySunLighting();
    });
    document.getElementById("toggle-3d")?.addEventListener("click", () => {
      void applyViewMode(!is3DMode);
    });
    setTerrassePoiStatus(
      (document.getElementById("poi-enabled") as HTMLInputElement)?.checked ?? true
    );
    try {
      terrasseLayer = await buildTerrasseLayerDeduped();
      if (terrasseRectLayer) {
        scene.add(terrasseRectLayer);
      }
      if (terrasseLayer) {
        scene.add(terrasseLayer);
      }
    } catch (e) {
      console.error(e);
      terrasseLoadStats = null;
      const el = document.getElementById("poi-status");
      if (el) {
        el.textContent = "Impossible de charger la couche terrasses SITG (réseau ou service).";
      }
    }
    const poiChk = document.getElementById("poi-enabled");
    const syncTerrasse = () => {
      const on = (document.getElementById("poi-enabled") as HTMLInputElement)?.checked ?? true;
      if (terrasseRectLayer) {
        terrasseRectLayer.visible = on;
      }
      if (terrasseLayer) {
        terrasseLayer.visible = on;
      }
      setTerrassePoiStatus(on);
    };
    poiChk?.addEventListener("change", syncTerrasse);
    syncTerrasse();
    void applyViewMode(false);
  })
  .catch((err) => {
    console.error(err);
  });
