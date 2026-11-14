import type { SheetId } from '../types'

export interface SheetMeta {
  id: SheetId
  title: string
  summary: string
}

export const SHEETS: SheetMeta[] = [
  { id: 'effet-de-sol', title: 'Effet de sol', summary: 'Comment le fond plat aspire la voiture vers la piste, et pourquoi elle peut se mettre à rebondir.' },
  { id: 'drs', title: 'DRS et aéro active', summary: 'Ouvrir l’aileron pour réduire la traînée : du DRS (2011-2025) aux modes X/Z de 2026.' },
  { id: 'ers', title: 'Récupération d’énergie (ERS)', summary: 'MGU-K, MGU-H, batterie : le trajet de l’énergie dans un groupe propulseur hybride.' },
  { id: 'pneus', title: 'Pneus', summary: 'Six mélanges, des fenêtres de température étroites et une dégradation à gérer.' },
  { id: 'freins', title: 'Freins', summary: 'Des disques en carbone qui travaillent jusqu’à 1000 °C et freinent à plus de 5 g.' },
]

export const SHEET_TITLES: Record<SheetId, string> = Object.fromEntries(SHEETS.map((s) => [s.id, s.title])) as Record<SheetId, string>

/* ------------------------------------------------------------------ */
/* Tyres                                                               */
/* ------------------------------------------------------------------ */

export interface Compound {
  id: string
  name: string
  color: string
  /** Indicative operating window (°C, tyre surface/carcass mix). */
  window: [number, number]
  grip: number
  durability: number
  note: string
}

/**
 * Indicative values. Pirelli no longer publishes exact working ranges per compound; the softer the
 * compound, the lower and narrower its window. Grip/durability are relative scales (1-5).
 */
export const COMPOUNDS: Compound[] = [
  { id: 'C1', name: 'C1', color: '#f0f0f0', window: [110, 135], grip: 1, durability: 5, note: 'Le plus dur : circuits très abrasifs ou très chargés (Silverstone, Suzuka).' },
  { id: 'C2', name: 'C2', color: '#f0f0f0', window: [105, 130], grip: 2, durability: 4, note: 'Dur ou medium selon le week-end.' },
  { id: 'C3', name: 'C3', color: '#ffd700', window: [95, 120], grip: 3, durability: 3, note: 'Le mélange « pivot » de la gamme.' },
  { id: 'C4', name: 'C4', color: '#ffd700', window: [90, 115], grip: 4, durability: 2, note: 'Tendre ou medium sur les circuits peu abrasifs.' },
  { id: 'C5', name: 'C5', color: '#ff3333', window: [85, 110], grip: 5, durability: 1, note: 'Très tendre : circuits urbains, Monaco.' },
  { id: 'C6', name: 'C6', color: '#ff3333', window: [80, 105], grip: 5, durability: 1, note: 'Introduit en 2025, le plus tendre jamais proposé dans la gamme actuelle.' },
]

export const WET_TYRES = [
  { name: 'Intermédiaire', color: '#39b54a', text: 'Piste humide ou séchante. Évacue environ 30 litres d’eau par seconde et par pneu à 300 km/h.' },
  { name: 'Pluie', color: '#0072c6', text: 'Forte pluie. Évacue environ 85 litres d’eau par seconde et par pneu à 300 km/h.' },
]

/* ------------------------------------------------------------------ */
/* ERS                                                                 */
/* ------------------------------------------------------------------ */

export interface ErsEra {
  id: '2014' | '2026'
  label: string
  ice: string
  mguk: string
  mguh: string
  harvest: string
  deploy: string
  notes: string[]
}

export const ERS_ERAS: ErsEra[] = [
  {
    id: '2014',
    label: '2014-2025',
    ice: '≈ 550-600 kW',
    mguk: '120 kW',
    mguh: 'illimité (énergie)',
    harvest: '2 MJ/tour max. via le MGU-K',
    deploy: '4 MJ/tour max. vers le MGU-K',
    notes: [
      'Le MGU-H, sur l’arbre du turbo, récupère l’énergie des gaz d’échappement et peut alimenter directement le MGU-K, sans limite d’énergie.',
      'Il sert aussi à lancer le turbo pour supprimer le temps de réponse (« turbo lag »).',
      'Débit de carburant limité à 100 kg/h ; rendement thermique supérieur à 50 %.',
    ],
  },
  {
    id: '2026',
    label: '2026',
    ice: '≈ 400 kW',
    mguk: '350 kW',
    mguh: 'supprimé',
    harvest: 'jusqu’à 8,5 MJ/tour via le MGU-K',
    deploy: 'environ 50 % de la puissance totale',
    notes: [
      'Sans MGU-H, toute l’énergie électrique vient du freinage (et du moteur thermique qui peut entraîner le MGU-K en générateur).',
      'Carburant 100 % durable, débit limité en énergie (3000 MJ/h).',
      'Pour dépasser : le « Manual Override Mode » donne un surplus d’énergie électrique à moins d’une seconde d’un adversaire.',
      'Animation 3D des flux d’énergie (freinage, déploiement, Override) : onglet « Mécanique », système MGU-K & batterie.',
    ],
  },
]
