import { Activity, Wrench, BrainCircuit, Map, History } from 'lucide-react'

export const NAV = [
  { to: '/live', label: 'Live', icon: Activity, desc: 'Chronos, positions et analyses de course en direct ou en replay.' },
  { to: '/tech', label: 'Technique', icon: Wrench, desc: 'Explorez une F1 en 3D, composant par composant, et visualisez les flux d’air.' },
  { to: '/predictions', label: 'Prédictions & météo', icon: BrainCircuit, desc: 'Prédictions de course en temps réel et alertes météo à venir.' },
  { to: '/circuits', label: 'Circuits', icon: Map, desc: 'Tous les tracés, virages, zones DRS et caractéristiques.' },
  { to: '/history', label: 'Histoire', icon: History, desc: 'De 1950 à aujourd’hui : ères, champions et moments marquants.' },
] as const
