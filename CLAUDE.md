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

## Thème « Paddock » (clair par défaut + sombre)
- Tokens dans `src/index.css` : valeurs claires dans `@theme`, valeurs sombres sous `[data-theme="dark"]`, sous `.theme-dark`
  et sous `prefers-color-scheme: dark`. Bouton clair/sombre dans l'en-tête (`useTheme` dans `@/lib/theme`, stocké en localStorage).
- **Ne jamais coder une couleur d'interface en dur** : utiliser les classes de tokens (`bg-bg`, `bg-surface`, `bg-surface-2`,
  `border-border`, `text-text`, `text-muted`, `text-f1`/`bg-f1`, `text-on-f1`, `bg-carbon`, `text-accent`, `text-warn`,
  `text-ok`, `text-info`) ou `var(--color-*)` (fonctionne aussi dans les props SVG / recharts). Variante Tailwind `dark:` disponible.
  Pour canvas / three.js qui ont besoin de valeurs littérales : `useThemeColors()` (`@/lib/theme`).
- Les scènes 3D, la soufflerie et les fonds de carte « instrument » restent sombres : envelopper dans `.theme-dark`.
- Typo : Archivo partout (`font-sans`), titres en version large avec `font-wide font-extrabold`, chiffres en `font-mono`
  (JetBrains Mono). `font-black` est plafonné à 800. Rouge F1 réservé à la marque, aux actions principales et aux alertes.
- Logo « Damier » : `@/components/Logo`. Composants partagés : `Page`, `PageHeader`, `Card`, `Loader`, `ErrorState`, `Badge`,
  `TeamStripe` (`@/components/ui`). Couleurs pneus : `TYRE_COLORS` (`@/lib/api`, Dur = `var(--color-tyre-hard)`).
- Responsive mobile obligatoire.

## API
- `fetchJson` (`@/lib/api/http`) : cache mémoire + file d'attente par hôte (OpenF1/Jolpica renvoient des 429). Toujours l'utiliser.
- OpenF1 : historique gratuit ; le temps réel en session demande un compte payant → prévoir un mode replay ou « dernière session ».
- Jolpica (Ergast) : 1950 → aujourd'hui, `limit` max 100.
- Open-Meteo : prévisions horaires.

## Vérification
`npm run typecheck` doit passer. Ne pas lancer `npm run build`/`npm install` en parallèle d'autres agents.
