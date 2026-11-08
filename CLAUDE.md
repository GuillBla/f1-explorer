# F1 Explorer

Site statique (GitHub Pages) d'exploration de la F1. UI en **français**.

## Stack
Vite 7 + React 19 + TypeScript 7 (strict, `noUnusedLocals`), Tailwind v4 (tokens dans `src/index.css` `@theme`),
React Router (HashRouter), TanStack Query, Zustand, three + @react-three/fiber + @react-three/drei,
recharts, d3, motion, lucide-react, clsx, date-fns. Alias `@/` → `src/`.

## Contraintes
- **100 % client-side** : aucun backend, aucune clé d'API secrète. Uniquement des API publiques avec CORS.
- `vite.config.ts` utilise `base: './'` + HashRouter : les assets statiques vont dans `public/` et se référencent
  par chemin relatif (`./data/x.json`), ou s'importent depuis `src/`.
- Les données lourdes et statiques (tracés, historique éditorial) vont en JSON dans `src/features/<module>/data/`
  ou `public/data/<module>/`.

## Structure et propriété
- `src/components/` (Layout, Home, ui.tsx), `src/lib/api/` (http, openf1, jolpica, weather), `src/App.tsx` : **socle partagé**.
  Les modules ne les modifient pas ; ils peuvent les étendre localement dans leur dossier.
- `src/features/<module>/index.tsx` : point d'entrée (export default), monté sur `/<module>/*` ; routes imbriquées autorisées.
- Modules : `live`, `tech`, `predictions`, `circuits`, `history`. Chaque module ne modifie **que** son dossier
  (et `public/data/<module>/`).

## Couleurs / style
Utiliser les classes de tokens : `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-text`, `text-muted`,
`text-f1`/`bg-f1` (rouge), `text-accent`, `text-warn`, `text-ok`, `text-info`. Polices `font-sans` (Titillium Web), `font-mono`.
Composants partagés : `Page`, `PageHeader`, `Card`, `Loader`, `ErrorState`, `Badge`, `TeamStripe` (`@/components/ui`).
Couleurs pneus : `TYRE_COLORS` (`@/lib/api`). Responsive mobile obligatoire.

## API
- `fetchJson` (`@/lib/api/http`) : cache mémoire + file d'attente par hôte (OpenF1/Jolpica renvoient des 429). Toujours l'utiliser.
- OpenF1 : historique gratuit ; le temps réel en session demande un compte payant → prévoir un mode replay ou « dernière session ».
- Jolpica (Ergast) : 1950 → aujourd'hui, `limit` max 100.
- Open-Meteo : prévisions horaires.

## Vérification
`npm run typecheck` doit passer. Ne pas lancer `npm run build`/`npm install` en parallèle d'autres agents.
