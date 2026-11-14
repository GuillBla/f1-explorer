/** Mechanical systems shown in the "Mécanique" tab, in display order. */
export type SystemId = 'moteur' | 'turbo' | 'ers' | 'boite' | 'freins' | 'suspension' | 'direction'

export interface SystemMeta {
  id: SystemId
  title: string
  short: string
  summary: string
}

export const SYSTEMS: SystemMeta[] = [
  { id: 'moteur', short: 'V6 thermique', title: 'Moteur V6 1,6 L turbo', summary: 'Vilebrequin, bielles, pistons, soupapes et cycle à 4 temps en coupe.' },
  { id: 'turbo', short: 'Turbo', title: 'Turbocompresseur', summary: 'Turbine, compresseur, wastegate et temps de réponse sans MGU-H.' },
  { id: 'ers', short: 'MGU-K & batterie', title: 'MGU-K et batterie (ERS 2026)', summary: 'Récupération au freinage, déploiement jusqu’à 350 kW, Manual Override.' },
  { id: 'boite', short: 'Boîte 8 rapports', title: 'Boîte séquentielle 8 rapports', summary: 'Pignons, crabots, barillet de sélection et différentiel.' },
  { id: 'freins', short: 'Freins', title: 'Freins carbone et brake-by-wire', summary: 'Étrier 6 pistons, disque ventilé qui rougit, répartition MGU-K / hydraulique.' },
  { id: 'suspension', short: 'Suspension', title: 'Suspension push-rod / pull-rod', summary: 'Culbuteur, barre de torsion, amortisseur et inerter sur une bosse.' },
  { id: 'direction', short: 'Volant & direction', title: 'Volant et direction', summary: 'Crémaillère, biellettes et commandes principales du volant.' },
]
