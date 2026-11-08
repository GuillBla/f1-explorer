import type { Era } from './types'

/**
 * Les grandes ères de la Formule 1. Contenu éditorial : les découpages sont des repères
 * narratifs (les réglementations ne changent pas toujours d'un bloc).
 */
export const ERAS: Era[] = [
  {
    id: 'debuts',
    start: 1950,
    end: 1957,
    title: 'Les débuts',
    subtitle: 'Moteurs avant et gentlemen drivers',
    color: '#c9a24a',
    shape: 'cigar',
    description:
      "Le championnat du monde naît à Silverstone le 13 mai 1950. Les voitures sont des cigares à moteur avant, les pilotes courent sans ceinture ni arceau. Alfa Romeo, Ferrari, Maserati puis Mercedes dominent, et Juan Manuel Fangio remporte cinq titres.",
    innovations: [
      'Moteurs suralimentés (1,5 l à compresseur) ou atmosphériques (4,5 l) jusqu’en 1951',
      'Championnats 1952-1953 courus selon la réglementation F2',
      'Mercedes W196 (1954) : injection directe et distribution desmodromique',
      'Carrosseries carénées « streamliner » sur les circuits rapides',
    ],
    cars: [
      { name: 'Alfa Romeo 158', year: 1950, team: 'Alfa Romeo', color: '#b3121b', note: 'Farina, premier champion du monde' },
      { name: 'Mercedes W196', year: 1954, team: 'Mercedes-Benz', color: '#c7ccd1', note: 'Fangio champion 1954 et 1955' },
      { name: 'Maserati 250F', year: 1957, team: 'Maserati', color: '#b3121b', accent: '#f2f2f2', note: 'Cinquième titre de Fangio' },
    ],
  },
  {
    id: 'moteur-arriere',
    start: 1958,
    end: 1967,
    title: 'La révolution du moteur arrière',
    subtitle: 'Cooper, Lotus et la monocoque',
    color: '#2e8b57',
    shape: 'rear',
    description:
      "Les petites Cooper à moteur arrière renversent l’ordre établi : Stirling Moss gagne en Argentine en 1958, Jack Brabham est sacré en 1959 et 1960. Colin Chapman et Lotus inventent la F1 moderne avec la monocoque. Le championnat constructeurs est créé en 1958.",
    innovations: [
      'Moteur placé derrière le pilote (Cooper)',
      'Châssis monocoque (Lotus 25, 1962)',
      'Formule 1,5 litre de 1961 à 1965, puis 3 litres dès 1966',
      'Moteur Cosworth DFV porteur (Lotus 49, 1967)',
    ],
    cars: [
      { name: 'Cooper T51', year: 1959, team: 'Cooper', color: '#1f5a3a', accent: '#f2f2f2', note: 'Premier titre d’une voiture à moteur arrière' },
      { name: 'Lotus 25', year: 1962, team: 'Lotus', color: '#1f6b3a', accent: '#f4d03f', note: 'Monocoque, Clark champion 1963' },
      { name: 'Lotus 49', year: 1967, team: 'Lotus', color: '#1f6b3a', accent: '#f4d03f', note: 'Victoire dès ses débuts avec le DFV' },
    ],
  },
  {
    id: 'ailerons-sponsoring',
    start: 1968,
    end: 1976,
    title: 'Ailerons et sponsoring',
    subtitle: 'L’appui aérodynamique et les livrées commerciales',
    color: '#d9632b',
    shape: 'wing',
    description:
      "En 1968, Lotus abandonne les couleurs nationales pour la livrée Gold Leaf et les ailerons apparaissent. La décennie est spectaculaire mais meurtrière : Jackie Stewart mène le combat pour la sécurité. Elle s’achève sur le duel Hunt-Lauda de 1976.",
    innovations: [
      'Ailerons (1968), ailerons hauts interdits en 1969',
      'Radiateurs latéraux et profil en coin (Lotus 72, 1970)',
      'Pneus slicks',
      'Tyrrell P34 à six roues (1976)',
    ],
    cars: [
      { name: 'Lotus 72', year: 1970, team: 'Lotus', color: '#111111', accent: '#c9a24a', note: 'Champion avec Rindt puis Fittipaldi' },
      { name: 'Ferrari 312T', year: 1975, team: 'Ferrari', color: '#c8102e', accent: '#f2f2f2', note: 'Boîte transversale, Lauda champion 1975' },
      { name: 'Tyrrell P34', year: 1976, team: 'Tyrrell', color: '#1d4e9a', accent: '#f2f2f2', note: 'Six roues, doublé en Suède' },
    ],
  },
  {
    id: 'effet-de-sol',
    start: 1977,
    end: 1982,
    title: 'L’effet de sol',
    subtitle: 'Les voitures-ailes',
    color: '#c9a227',
    shape: 'wedge',
    description:
      "Chapman transforme toute la voiture en aile inversée : pontons profilés et jupes coulissantes collent la Lotus 79 au sol. Renault introduit le turbo en 1977. Les vitesses en courbe explosent, comme les tensions entre FISA et FOCA.",
    innovations: [
      'Pontons à effet de sol et jupes (Lotus 78, 79)',
      'Moteur turbo (Renault RS01, 1977)',
      'Monocoque en fibre de carbone (McLaren MP4/1, 1981)',
      'Fond plat imposé à partir de 1983',
    ],
    cars: [
      { name: 'Lotus 79', year: 1978, team: 'Lotus', color: '#111111', accent: '#c9a24a', note: 'Andretti champion 1978' },
      { name: 'Renault RS01', year: 1977, team: 'Renault', color: '#f2c200', accent: '#111111', note: 'Premier moteur turbo en F1' },
      { name: 'Williams FW07', year: 1980, team: 'Williams', color: '#f2f2f2', accent: '#1a7a3c', note: 'Premier titre de Williams' },
    ],
  },
  {
    id: 'turbo',
    start: 1983,
    end: 1988,
    title: 'L’ère turbo',
    subtitle: 'Plus de 1 000 chevaux en qualification',
    color: '#e0402f',
    shape: 'turbo',
    description:
      "Les 1,5 litre turbo atteignent des puissances jamais revues en qualification. Piquet devient le premier champion turbo en 1983, McLaren-TAG puis Williams-Honda dominent, avant l’année quasi parfaite de la McLaren MP4/4 en 1988.",
    innovations: [
      'Moteurs 1,5 l turbocompressés',
      'Gestion électronique du moteur et télémétrie',
      'Limitation progressive de la pression de suralimentation et du carburant',
      'Interdiction des turbos à la fin de 1988',
    ],
    cars: [
      { name: 'Brabham BT52', year: 1983, team: 'Brabham', color: '#1b3f8b', accent: '#f2f2f2', note: 'Premier titre turbo (Piquet)' },
      { name: 'Williams FW11', year: 1986, team: 'Williams', color: '#1b3f8b', accent: '#f2c200', note: 'Moteur Honda, titres constructeurs 1986-1987' },
      { name: 'McLaren MP4/4', year: 1988, team: 'McLaren', color: '#f2f2f2', accent: '#d7192d', note: '15 victoires sur 16 Grands Prix' },
    ],
  },
  {
    id: 'electronique',
    start: 1989,
    end: 1993,
    title: 'Atmosphériques et électronique',
    subtitle: 'Senna, Prost et les voitures « intelligentes »',
    color: '#3fa9f5',
    shape: 'nose',
    description:
      "Retour aux moteurs atmosphériques de 3,5 litres. La rivalité Senna-Prost culmine à Suzuka en 1989 et 1990. Boîte semi-automatique, suspension active et antipatinage font de la Williams FW14B une machine de science-fiction.",
    innovations: [
      'Boîte de vitesses semi-automatique (Ferrari 640, 1989)',
      'Suspension active (Williams FW14B, 1992)',
      'Antipatinage et aides électroniques',
      'Interdiction de la plupart des aides électroniques pour 1994',
    ],
    cars: [
      { name: 'Ferrari 640', year: 1989, team: 'Ferrari', color: '#c8102e', note: 'Victoire dès sa première course' },
      { name: 'McLaren MP4/6', year: 1991, team: 'McLaren', color: '#f2f2f2', accent: '#d7192d', note: 'Troisième titre de Senna' },
      { name: 'Williams FW14B', year: 1992, team: 'Williams', color: '#1b3f8b', accent: '#f2c200', note: 'Mansell, 9 victoires' },
    ],
  },
  {
    id: 'securite',
    start: 1994,
    end: 1997,
    title: 'Le tournant de la sécurité',
    subtitle: 'Après Imola 1994',
    color: '#e10600',
    shape: 'nose',
    description:
      "La mort de Roland Ratzenberger et d’Ayrton Senna à Imola provoque une refonte profonde : cylindrée réduite, protections latérales du cockpit, crash-tests renforcés. Michael Schumacher remporte ses deux premiers titres avec Benetton.",
    innovations: [
      'Planche de fond (patin) et réduction de l’appui dès 1994',
      'Moteurs ramenés à 3 litres en 1995',
      'Rebords de cockpit relevés et protection de la tête (1996)',
      'Crash-tests renforcés',
    ],
    cars: [
      { name: 'Benetton B194', year: 1994, team: 'Benetton', color: '#1a8fc9', accent: '#2db34a', note: 'Premier titre de Schumacher' },
      { name: 'Williams FW18', year: 1996, team: 'Williams', color: '#1b3f8b', accent: '#f2f2f2', note: 'Damon Hill champion' },
    ],
  },
  {
    id: 'v10',
    start: 1998,
    end: 1999,
    title: 'V10 et pneus rainurés',
    subtitle: 'McLaren-Mercedes contre Ferrari',
    color: '#9aa4b1',
    shape: 'modern',
    description:
      "Voies réduites et pneus rainurés pour limiter les vitesses en courbe. Le V10 de 3 litres devient la norme. Mika Häkkinen et McLaren-Mercedes battent Ferrari deux fois de suite.",
    innovations: [
      'Pneus rainurés et voitures plus étroites (1998)',
      'V10 3 litres à très haut régime',
      'Guerre des pneus Bridgestone / Goodyear',
    ],
    cars: [
      { name: 'McLaren MP4/13', year: 1998, team: 'McLaren', color: '#b9bec4', accent: '#111111', note: 'Premier titre de Häkkinen' },
    ],
  },
  {
    id: 'schumacher-ferrari',
    start: 2000,
    end: 2005,
    title: 'L’ère Schumacher-Ferrari',
    subtitle: 'Cinq titres consécutifs',
    color: '#dc0000',
    shape: 'modern',
    description:
      "De 2000 à 2004, Michael Schumacher et Ferrari raflent tous les titres pilotes. La domination est telle que les règles changent (qualifications, pneus). En 2005, Fernando Alonso et Renault mettent fin au règne.",
    innovations: [
      'Dispositif HANS obligatoire (2003)',
      'Interdiction des consignes d’équipe (2003)',
      'Moteurs devant tenir deux week-ends de course (2005)',
    ],
    cars: [
      { name: 'Ferrari F2002', year: 2002, team: 'Ferrari', color: '#dc0000', note: 'Titre pilote acquis dès juillet' },
      { name: 'Ferrari F2004', year: 2004, team: 'Ferrari', color: '#dc0000', note: '13 victoires pour Schumacher' },
      { name: 'Renault R25', year: 2005, team: 'Renault', color: '#1a4fa0', accent: '#f2c200', note: 'Alonso, plus jeune champion à l’époque' },
    ],
  },
  {
    id: 'v8',
    start: 2006,
    end: 2008,
    title: 'Les V8',
    subtitle: 'Alonso, Räikkönen, Hamilton',
    color: '#8e7cc3',
    shape: 'modern',
    description:
      "Les V8 de 2,4 litres remplacent les V10. Trois saisons, trois champions différents et des fins de championnat haletantes, sur fond d’affaire d’espionnage entre McLaren et Ferrari en 2007.",
    innovations: [
      'V8 2,4 litres, régime limité puis moteurs gelés',
      'Fournisseur de pneus unique (2007)',
      'Premier Grand Prix de nuit (Singapour, 2008)',
    ],
    cars: [
      { name: 'Ferrari F2007', year: 2007, team: 'Ferrari', color: '#dc0000', note: 'Räikkönen champion pour un point' },
      { name: 'McLaren MP4-23', year: 2008, team: 'McLaren', color: '#b9bec4', accent: '#d7192d', note: 'Premier titre de Hamilton' },
    ],
  },
  {
    id: 'kers-drs',
    start: 2009,
    end: 2013,
    title: 'KERS et DRS',
    subtitle: 'Brawn, puis Red Bull et Vettel',
    color: '#1e5bc6',
    shape: 'modern',
    description:
      "Nouvelle aérodynamique, récupération d’énergie (KERS) et, dès 2011, aileron arrière mobile (DRS) pour favoriser les dépassements. Brawn GP crée la surprise en 2009 grâce au double diffuseur, puis Sebastian Vettel et Red Bull alignent quatre doublés.",
    innovations: [
      'KERS : récupération d’énergie au freinage (2009)',
      'Double diffuseur (2009)',
      'Fin des ravitaillements (2010)',
      'DRS et pneus Pirelli (2011)',
    ],
    cars: [
      { name: 'Brawn BGP 001', year: 2009, team: 'Brawn GP', color: '#f2f2f2', accent: '#c6e000', note: 'Doublé dès sa première course' },
      { name: 'Red Bull RB9', year: 2013, team: 'Red Bull', color: '#1b2a5c', accent: '#d7192d', note: '9 victoires consécutives de Vettel' },
    ],
  },
  {
    id: 'hybride',
    start: 2014,
    end: 2021,
    title: 'L’ère hybride V6 turbo',
    subtitle: 'La domination Mercedes',
    color: '#00d2be',
    shape: 'hybrid',
    description:
      "Les groupes propulseurs V6 1,6 litre turbo hybrides (MGU-K et MGU-H) inaugurent une ère d’efficacité énergétique. Mercedes remporte huit titres constructeurs consécutifs, Lewis Hamilton égale les sept titres de Schumacher. Le halo devient obligatoire en 2018.",
    innovations: [
      'V6 1,6 l turbo hybride, MGU-K et MGU-H',
      'Voiture de sécurité virtuelle (2015)',
      'Voitures plus larges et plus rapides (2017)',
      'Halo obligatoire (2018), plafond budgétaire (2021)',
    ],
    cars: [
      { name: 'Mercedes W07', year: 2016, team: 'Mercedes', color: '#b9bec4', accent: '#00d2be', note: 'Duel Hamilton-Rosberg' },
      { name: 'Mercedes W11', year: 2020, team: 'Mercedes', color: '#1a1a1a', accent: '#00d2be', note: 'Septième titre de Hamilton' },
    ],
  },
  {
    id: 'effet-de-sol-2022',
    start: 2022,
    end: 2025,
    title: 'Le retour de l’effet de sol',
    subtitle: 'Venturi sous le plancher',
    color: '#6c4cd6',
    shape: 'groundEffect',
    description:
      "Les voitures redessinées génèrent l’essentiel de leur appui sous le plancher pour permettre de se suivre de près. Red Bull et Max Verstappen écrasent 2023, avant que McLaren ne revienne au sommet.",
    innovations: [
      'Fond à canaux Venturi et pontons sculptés',
      'Roues de 18 pouces',
      'Marsouinage (porpoising) et règles anti-rebond',
    ],
    cars: [
      { name: 'Red Bull RB19', year: 2023, team: 'Red Bull', color: '#1b2a5c', accent: '#d7192d', note: '21 victoires sur 22 Grands Prix' },
      { name: 'McLaren MCL38', year: 2024, team: 'McLaren', color: '#ff8000', accent: '#111111', note: 'Titre constructeurs 2024' },
    ],
  },
  {
    id: '2026',
    start: 2026,
    end: 2026,
    title: 'Nouvelle réglementation 2026',
    subtitle: 'Aéro active et hybride 50/50',
    color: '#ff2d55',
    shape: 'active2026',
    description:
      "Voitures plus petites et plus légères, aérodynamique active, et groupes propulseurs dont la part électrique avoisine celle du moteur thermique, avec un carburant 100 % durable. Le MGU-H disparaît. Audi et Cadillac rejoignent la grille.",
    innovations: [
      'Aérodynamique active (ailerons à configurations multiples)',
      'Puissance électrique fortement accrue, suppression du MGU-H',
      'Carburant entièrement durable',
      'Voitures plus courtes, plus étroites et plus légères',
    ],
    cars: [
      { name: 'Concept FIA 2026', year: 2026, team: 'FIA', color: '#2a2f3a', accent: '#ff2d55', note: 'Silhouette réglementaire stylisée' },
    ],
  },
]

export function eraForYear(year: number): Era | undefined {
  return ERAS.find((e) => year >= e.start && year <= e.end)
}
