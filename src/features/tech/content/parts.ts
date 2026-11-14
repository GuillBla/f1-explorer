import type { KeyFigure, PartId, PartInfo } from '../types'

/**
 * Editorial content for each clickable component of the 3D car.
 * Figures are orders of magnitude from public regulations (FIA Technical Regulations)
 * and public communications of suppliers; team-specific values are never published.
 */
export const PARTS: Record<PartId, PartInfo> = {
  frontWing: {
    id: 'frontWing',
    name: 'Aileron avant',
    short: 'Aileron AV',
    role: 'Premier élément touché par l’air : il crée de l’appui sur l’essieu avant et « prépare » l’écoulement pour tout le reste de la voiture.',
    how: [
      'C’est une aile d’avion inversée : son profil cambré vers le bas accélère l’air sous les éléments, ce qui crée une dépression et donc une force verticale vers le sol (l’appui). Les éléments sont empilés avec des fentes entre eux pour que l’air reste collé aux profils à forte incidence.',
      'Très proche de la piste, il bénéficie lui aussi d’un effet de sol : plus il est bas, plus il produit d’appui, jusqu’au décrochage. Il dévie aussi l’air autour des roues avant (outwash/inwash) et génère des tourbillons qui conditionnent l’alimentation du fond plat.',
      'Les mécaniciens peuvent modifier l’angle du volet supérieur lors d’un arrêt au stand pour corriger l’équilibre avant/arrière.',
    ],
    figures: [
      { label: 'Éléments (modèle)', value: '1 fixe + 2 mobiles', note: '4 max. en 2022-2025' },
      { label: 'Part de l’appui', value: '≈ 25-30 %', note: 'ordre de grandeur, varie selon le réglage' },
      { label: 'Garde au sol', value: '≈ 5-10 cm', note: 'en statique' },
      { label: 'Flexion max. (test 1000 N)', value: '10 mm', note: 'depuis le GP d’Espagne 2025 (15 mm avant)' },
    ],
    regulation: [
      { year: '2009', text: 'Aileron élargi à 1800 mm et volet réglable par le pilote (abandonné fin 2010).' },
      { year: '2017', text: 'Aileron en flèche, voitures plus larges (2000 mm).' },
      { year: '2019', text: 'Ailerons simplifiés (moins de déflecteurs sur les plaques latérales) pour limiter l’outwash.' },
      { year: '2022', text: 'Aileron intégré au nez, plaques latérales arrondies, objectif : réduire l’air perturbé envoyé derrière.' },
      { year: '2025', text: 'Tests de flexion durcis pour lutter contre les ailerons « souples ».' },
    ],
    y2026: 'Aileron environ 100 mm plus étroit et aérodynamique active : deux volets mobiles s’ouvrent en ligne droite (mode X, « Straight Line Mode ») et se referment en virage (mode Z, « Corner Mode »), en même temps que l’aileron arrière, pour garder l’équilibre de la voiture.',
    aero: true,
  },
  wheels: {
    id: 'wheels',
    name: 'Roues et pneus',
    short: 'Roues',
    role: 'Seul contact avec la piste : les quatre empreintes (chacune grande comme une carte postale environ) transmettent accélération, freinage et appui latéral.',
    how: [
      'Le pneu ne fonctionne bien que dans une fenêtre de température : trop froid, la gomme n’adhère pas et grène ; trop chaud, elle se dégrade (surchauffe, cloques). La gestion des pneus est souvent la clé d’une course.',
      'Pirelli, fournisseur unique depuis 2011, apporte trois mélanges secs par Grand Prix (dur, medium, tendre), choisis parmi six (C1 à C6). En course sur le sec, deux mélanges différents doivent être utilisés.',
      'Aérodynamiquement, une roue qui tourne est un obstacle très « sale » : son sillage turbulent perturbe le fond plat et la voiture qui suit.',
    ],
    figures: [
      { label: 'Jantes', value: '18 pouces', note: 'depuis 2022 (13 pouces avant)' },
      { label: 'Diamètre pneu', value: '≈ 705-710 mm', note: '2026 (720 mm en 2022-2025)' },
      { label: 'Couvertures chauffantes', value: '70 °C', note: 'température maximale autorisée (2024-2025)' },
      { label: 'Arrêt au stand record', value: '1,80 s', note: 'McLaren, Qatar 2023' },
    ],
    regulation: [
      { year: '1998', text: 'Pneus rainurés pour réduire l’adhérence (jusqu’en 2008).' },
      { year: '2009', text: 'Retour des pneus slicks.' },
      { year: '2011', text: 'Pirelli devient manufacturier unique.' },
      { year: '2022', text: 'Passage aux jantes de 18 pouces, flancs plus bas et moins déformables.' },
      { year: '2025', text: 'Introduction d’un sixième mélange, le C6, le plus tendre.' },
    ],
    y2026: 'Pneus plus étroits (environ −25 mm à l’avant et −30 mm à l’arrière) et diamètre légèrement réduit, pour alléger la voiture et diminuer la traînée.',
    sheet: 'pneus',
  },
  suspension: {
    id: 'suspension',
    name: 'Suspension',
    short: 'Suspension',
    role: 'Relie les roues au châssis, contrôle les mouvements de caisse et surtout la plateforme aérodynamique (hauteur et assiette).',
    how: [
      'Chaque roue est tenue par deux triangles (double wishbone) et une biellette de direction. Une tige de poussée (push-rod) ou de traction (pull-rod) transmet les efforts à des ressorts de torsion et amortisseurs logés dans le châssis.',
      'Avec l’effet de sol, la hauteur de caisse est critique : la suspension doit être très ferme pour garder le fond plat près du sol sans le faire toucher, tout en encaissant les vibreurs.',
      'Le choix push-rod ou pull-rod est surtout une question de packaging et d’aérodynamique (position des triangles dans l’écoulement, centre de gravité).',
    ],
    figures: [
      { label: 'Architecture', value: 'Double triangle', note: 'modèle : push-rod AV, pull-rod AR' },
      { label: 'Suspension active', value: 'Interdite', note: 'depuis 1994' },
      { label: 'FRIC', value: 'Interdit', note: 'suspensions interconnectées, depuis mi-2014' },
    ],
    regulation: [
      { year: '1992', text: 'Apogée des suspensions actives (Williams FW14B).' },
      { year: '1994', text: 'Interdiction des suspensions actives.' },
      { year: '2014', text: 'Interdiction du FRIC (liaison hydraulique avant/arrière) en cours de saison.' },
      { year: '2022', text: 'Suspensions hydrauliques sophistiquées et inerteurs interdits, débattements simplifiés.' },
    ],
    y2026: 'Voiture plus courte (empattement max. 3400 mm, −200 mm), plus étroite (1900 mm) et plus légère (768 kg minimum, environ −30 kg). Le fond étant moins sensible à la hauteur de caisse, des réglages moins raides deviennent envisageables.',
  },
  brakes: {
    id: 'brakes',
    name: 'Freins',
    short: 'Freins',
    role: 'Arrêter une voiture de 800 kg lancée à plus de 300 km/h en quelques dizaines de mètres, tout en partageant le travail avec la récupération d’énergie.',
    how: [
      'Disques et plaquettes sont en carbone-carbone : léger, il conserve son coefficient de frottement à des températures où l’acier fondrait presque. Mais il ne freine bien qu’une fois chaud (à partir de 300-400 °C environ).',
      'Les disques sont percés de plus de mille petits canaux de ventilation. Des écopes (brake ducts) amènent l’air frais et participent aussi à l’aérodynamique et au réchauffage des jantes, donc des pneus.',
      'À l’arrière, le « brake-by-wire » répartit automatiquement l’effort entre le freinage hydraulique et le MGU-K, qui récupère de l’énergie en freinant le moteur électrique.',
    ],
    figures: [
      { label: 'Température', value: 'jusqu’à ≈ 1000 °C', note: 'pics au freinage' },
      { label: 'Décélération', value: '5 à 6 g', note: 'au début du freinage, à haute vitesse' },
      { label: 'Disque avant', value: '≈ 330 × 32 mm', note: 'diamètre × épaisseur, depuis 2022' },
      { label: 'Étriers', value: '6 pistons max.', note: 'alliage d’aluminium' },
    ],
    regulation: [
      { year: '1980s', text: 'Généralisation des freins en carbone.' },
      { year: '2014', text: 'Brake-by-wire autorisé à l’arrière pour gérer la récupération du MGU-K.' },
      { year: '2022', text: 'Disques plus grands pour les jantes de 18 pouces, écopes plus standardisées.' },
    ],
    y2026: 'Avec un MGU-K de 350 kW (près de trois fois plus qu’avant), une part beaucoup plus importante du freinage arrière est assurée électriquement : la gestion du brake-by-wire devient encore plus déterminante pour la stabilité.',
    sheet: 'freins',
  },
  halo: {
    id: 'halo',
    name: 'Halo',
    short: 'Halo',
    role: 'Arceau en titane qui protège la tête du pilote contre les débris, les roues et les retournements.',
    how: [
      'Fixé en trois points sur la monocoque, il doit résister à des charges de l’ordre d’une douzaine de tonnes sans se rompre ni se détacher.',
      'Contesté à son introduction pour son esthétique, il a depuis sauvé plusieurs pilotes : Charles Leclerc (Spa 2018), Romain Grosjean (Bahreïn 2020), Lewis Hamilton (Monza 2021), Zhou Guanyu (Silverstone 2022).',
      'Les équipes l’habillent de petits carénages aérodynamiques autorisés pour limiter sa perturbation sur l’airbox et l’aileron arrière.',
    ],
    figures: [
      { label: 'Matériau', value: 'Titane grade 5' },
      { label: 'Masse', value: '≈ 7 kg', note: 'structure nue' },
      { label: 'Charge supportée', value: '≈ 12 tonnes', note: 'ordre de grandeur des tests FIA' },
      { label: 'Obligatoire', value: 'depuis 2018' },
    ],
    regulation: [
      { year: '2016', text: 'Premiers essais en piste de plusieurs concepts (halo, aeroscreen, shield).' },
      { year: '2018', text: 'Halo obligatoire en F1, puis dans les formules de promotion.' },
      { year: '2023', text: 'Arceau de sécurité renforcé après l’accident de Zhou (Silverstone 2022).' },
    ],
    y2026: 'Le principe ne change pas ; les structures de protection (arceau, cellule de survie, structures d’impact) sont encore renforcées avec la nouvelle réglementation.',
  },
  cockpit: {
    id: 'cockpit',
    name: 'Cockpit et monocoque',
    short: 'Cockpit',
    role: 'Cellule de survie en composite de carbone qui accueille le pilote et le réservoir, et sur laquelle tout le reste est fixé.',
    how: [
      'La monocoque est un empilement de plis de fibre de carbone et de nid d’abeille d’aluminium, cuite en autoclave. Des panneaux anti-intrusion en Zylon protègent les flancs.',
      'Le réservoir souple (une vessie en kevlar) est placé juste derrière le pilote. Le nez, à l’avant, est une structure d’absorption de chocs homologuée par des crash-tests.',
      'Le pilote est allongé, les pieds plus hauts que les hanches. Le volant concentre une vingtaine de boutons et molettes (modes moteur, différentiel, freinage, radio…). Il doit pouvoir sortir de la voiture en 5 secondes.',
    ],
    figures: [
      { label: 'Masse min. pilote', value: '80 kg', note: 'avec siège, lest ajouté si besoin (depuis 2019)' },
      { label: 'Évacuation', value: '5 s', note: 'test d’extraction du pilote' },
      { label: 'Carburant max.', value: '110 kg', note: 'en course, 2019-2025' },
      { label: 'Masse min. voiture', value: '768 kg', note: '2026, pilote compris (800 kg en 2025)' },
    ],
    regulation: [
      { year: '1981', text: 'Première monocoque en carbone (McLaren MP4/1).' },
      { year: '2003', text: 'Système HANS obligatoire.' },
      { year: '2014', text: 'Nez abaissés pour des raisons de sécurité.' },
      { year: '2022', text: 'Crash-tests plus sévères, monocoque plus absorbante.' },
    ],
    y2026: 'Structure d’impact avant en deux étages (pour éviter qu’elle ne se détache entièrement lors d’un premier choc), protections latérales renforcées et masse minimale abaissée à 768 kg.',
  },
  sidepods: {
    id: 'sidepods',
    name: 'Pontons et entrées d’air',
    short: 'Pontons',
    role: 'Abritent les radiateurs (eau, huile, intercooler, électronique) et façonnent l’air qui file vers l’arrière et vers le fond plat.',
    how: [
      'L’air entre par les bouches, traverse les radiateurs puis ressort par des ouïes sur le capot ou à l’arrière. Plus la bouche est grande, mieux on refroidit, mais plus la traînée augmente : c’est un compromis permanent, ajusté circuit par circuit.',
      'La forme extérieure est un outil aérodynamique : le « downwash » (rampe descendante vers l’arrière), la découpe inférieure (undercut) qui guide l’air vers le bord du fond plat, et la taille de guêpe (coke bottle) qui accélère l’air vers le diffuseur et la poutre arrière.',
      'Les structures d’impact latérales, imposées par la FIA, sont noyées dans les pontons et contraignent la position des entrées d’air.',
    ],
    figures: [
      { label: 'Chaleur à évacuer', value: 'plusieurs centaines de kW', note: 'moteur thermique, électriques et batterie' },
      { label: 'Concepts 2022-2025', value: 'downwash, « zéropod », baignoire' },
    ],
    regulation: [
      { year: '2009', text: 'Suppression des appendices aérodynamiques (déflecteurs, cheminées).' },
      { year: '2022', text: 'Bargeboards supprimés : la forme des pontons devient l’un des principaux différenciateurs visuels.' },
    ],
    y2026: 'Le moteur électrique de 350 kW et la batterie demandent plus de refroidissement basse température, tandis que le moteur thermique, moins puissant (≈ 400 kW), en demande un peu moins : l’architecture des radiateurs est repensée.',
    aero: true,
  },
  floor: {
    id: 'floor',
    name: 'Fond plat et canaux Venturi',
    short: 'Fond plat',
    role: 'La plus grande surface aérodynamique de la voiture : depuis 2022, il produit la majorité de l’appui grâce à l’effet de sol.',
    how: [
      'Sous la voiture, deux canaux (tunnels Venturi) se resserrent puis s’élargissent. Dans le rétrécissement (le col), l’air accélère et sa pression chute (théorème de Bernoulli) : la voiture est aspirée vers la piste.',
      'L’effet de sol est très efficace : il crée de l’appui avec peu de traînée et produit moins d’air perturbé derrière que des ailerons. Mais il est très sensible à la hauteur de caisse : trop bas, l’écoulement décroche, l’appui s’effondre, la voiture remonte… puis l’appui revient : c’est le marsouinage (porpoising).',
      'Les bords du fond sont travaillés pour créer des tourbillons qui forment une « jupe » d’air virtuelle et empêchent l’air extérieur de remplir la zone de basse pression.',
    ],
    figures: [
      { label: 'Part de l’appui', value: '> 50 %', note: 'estimation pour 2022-2025' },
      { label: 'Canaux', value: '2', note: 'symétriques, gauche et droite' },
      { label: 'Bords relevés', value: '+15 mm', note: 'en 2023, contre le marsouinage' },
    ],
    regulation: [
      { year: '1977', text: 'Lotus 78 : premières voitures à effet de sol, avec jupes coulissantes.' },
      { year: '1983', text: 'Fond plat obligatoire entre les roues : fin de l’effet de sol « à jupes ».' },
      { year: '2022', text: 'Retour de l’effet de sol par canaux Venturi, apparition du marsouinage.' },
      { year: '2022-2023', text: 'Directive technique TD039 et métrique d’oscillation (AOM), bords du fond relevés.' },
    ],
    y2026: 'Fond plus plat, canaux Venturi moins marqués et diffuseur réduit : moins d’appui (environ −30 % visé au global) mais une voiture moins sensible à la hauteur de caisse et au marsouinage.',
    sheet: 'effet-de-sol',
    aero: true,
  },
  plank: {
    id: 'plank',
    name: 'Plancher (planche et patins)',
    short: 'Planche',
    role: 'Planche de bois composite fixée sous le fond : elle impose une garde au sol minimale en se mesurant à l’usure.',
    how: [
      'Introduite en 1994 après les accidents d’Imola, cette « planche » (plank ou skid block) empêche les équipes de faire rouler la voiture trop bas : si elle s’use de plus de 1 mm, la voiture est disqualifiée.',
      'Des patins en titane sont autorisés à certains endroits pour limiter l’usure. Ce sont eux qui produisent les gerbes d’étincelles quand la voiture touche le sol.',
      'L’épaisseur est contrôlée après la course au niveau de trous de mesure. Exemple célèbre : Hamilton et Leclerc disqualifiés à Austin en 2023.',
    ],
    figures: [
      { label: 'Épaisseur', value: '10 mm', note: 'neuve' },
      { label: 'Minimum', value: '9 mm', note: 'après la course' },
      { label: 'Matériau', value: 'Bois stratifié densifié', note: 'type Jabroc' },
    ],
    regulation: [
      { year: '1994', text: 'Planche obligatoire à partir du GP d’Allemagne.' },
      { year: '2015', text: 'Patins en titane imposés (au lieu du tungstène), d’où les étincelles.' },
      { year: '2022', text: 'Planche adaptée au nouveau fond à effet de sol.' },
    ],
    y2026: 'La planche reste ; le fond 2026, moins dépendant d’une hauteur très basse, devrait réduire les risques d’usure excessive.',
  },
  diffuser: {
    id: 'diffuser',
    name: 'Diffuseur',
    short: 'Diffuseur',
    role: 'Rampe ascendante à l’arrière du fond plat : il ralentit progressivement l’air accéléré sous la voiture et « pompe » le fond.',
    how: [
      'En s’élargissant, le diffuseur fait remonter la pression de l’air jusqu’à celle de l’air ambiant. Cette récupération progressive permet d’entretenir une très basse pression en amont, sous le fond : plus le diffuseur est efficace, plus le fond aspire.',
      'L’angle et la hauteur sont limités : si la rampe est trop raide, l’écoulement se décolle et l’effet disparaît. L’air chaud et rapide sortant du diffuseur interagit avec l’aileron arrière, qui l’aide à être extrait vers le haut.',
    ],
    figures: [
      { label: 'Rôle', value: 'Récupération de pression' },
      { label: 'Interaction', value: 'Aileron arrière', note: 'qui « aspire » le diffuseur' },
    ],
    regulation: [
      { year: '2009', text: 'Doubles diffuseurs (Brawn, Toyota, Williams), interdits fin 2010.' },
      { year: '2010-2011', text: 'Diffuseurs soufflés par les gaz d’échappement, progressivement interdits.' },
      { year: '2022', text: 'Diffuseur beaucoup plus grand, démarrant plus en avant, partie intégrante des canaux Venturi.' },
    ],
    y2026: 'Diffuseur réduit et suppression de l’aileron de poutre (beam wing) : l’ensemble fond/diffuseur produit moins d’appui mais un sillage moins violent.',
    sheet: 'effet-de-sol',
    aero: true,
  },
  rearWing: {
    id: 'rearWing',
    name: 'Aileron arrière et DRS / aéro active',
    short: 'Aileron AR',
    role: 'Crée l’appui sur l’essieu arrière ; son volet mobile permet de réduire la traînée en ligne droite.',
    how: [
      'Comme l’aileron avant, c’est une aile inversée à deux éléments (plan principal et volet). Placé haut, dans de l’air plus « propre », il est puissant mais coûteux en traînée.',
      'De 2011 à 2025, le DRS (Drag Reduction System) ouvrait le volet supérieur jusqu’à 85 mm dans des zones définies, si le pilote était à moins d’une seconde de la voiture qui le précède : la traînée chute et la vitesse de pointe gagne environ 10 à 15 km/h.',
      'L’aileron dévie aussi l’air vers le haut : combiné au diffuseur, il projette un sillage en forme de champignon, conçu depuis 2022 pour passer au-dessus de la voiture qui suit.',
    ],
    figures: [
      { label: 'Ouverture DRS', value: '85 mm max.', note: 'depuis 2019' },
      { label: 'Gain DRS', value: '≈ 10-15 km/h', note: 'selon circuit et réglages' },
      { label: 'Seuil d’activation', value: '< 1 s', note: 'au point de détection (2011-2025)' },
    ],
    regulation: [
      { year: '2011', text: 'Introduction du DRS.' },
      { year: '2019', text: 'Aileron plus large et plus haut, ouverture DRS portée à 85 mm.' },
      { year: '2022', text: 'Aileron enveloppant aux plaques latérales arrondies, aileron de poutre (beam wing) réintroduit.' },
      { year: '2024-2025', text: 'Contrôles renforcés contre les ailerons flexibles (« mini-DRS »).' },
    ],
    y2026: 'Fin du DRS. Place à l’aérodynamique active disponible pour tous : volets avant et arrière ouverts en ligne droite (mode X) et fermés en virage (mode Z). Pour dépasser, le pilote dispose du « Manual Override Mode », un surplus d’énergie électrique.',
    sheet: 'drs',
    aero: true,
  },
  engineCover: {
    id: 'engineCover',
    name: 'Capot moteur et airbox',
    short: 'Capot',
    role: 'Carénage du groupe propulseur, avec au-dessus de la tête du pilote la prise d’air (airbox) qui alimente le turbo.',
    how: [
      'L’airbox capte de l’air « dynamique » : à 300 km/h, la pression dynamique (½ρv²) vaut environ 4,3 kPa, soit un gain d’environ 4 % de pression à l’admission avant même le turbocompresseur.',
      'Elle est intégrée à l’arceau de sécurité, qui protège le pilote en cas de retournement. Certaines équipes y ajoutent une seconde entrée pour le refroidissement.',
      'La forme du capot (taille de guêpe, ouïes de refroidissement) dirige l’air chaud et l’écoulement extérieur vers l’aileron arrière.',
    ],
    figures: [
      { label: 'Pression dynamique', value: '≈ 4,3 kPa', note: 'à 300 km/h' },
      { label: 'Fonctions', value: 'Admission, arceau, refroidissement' },
    ],
    regulation: [
      { year: '2017', text: 'Ailerons de requin et « T-wings » sur les capots.' },
      { year: '2018', text: 'T-wings interdits, ailerons de requin réduits.' },
    ],
    y2026: 'Suppression du MGU-H et carburant 100 % durable : l’agencement du turbo et des échappements change, avec un capot redessiné.',
    aero: true,
  },
  powerUnit: {
    id: 'powerUnit',
    name: 'Groupe propulseur',
    short: 'Moteur',
    role: 'V6 turbo de 1,6 litre associé à un système de récupération d’énergie (ERS) : le cœur hybride de la voiture.',
    how: [
      'Le moteur thermique (ICE) est un V6 à 90° de 1,6 L suralimenté par un turbo. Le MGU-K, moteur-générateur relié au vilebrequin, récupère l’énergie au freinage et la restitue à l’accélération. La batterie (ES) stocke cette énergie ; le boîtier de contrôle (CE) gère les flux.',
      'Jusqu’en 2025, un second moteur-générateur, le MGU-H, était monté sur l’arbre du turbo : il récupérait l’énergie des gaz d’échappement et supprimait le temps de réponse du turbo. Ces moteurs ont dépassé 50 % de rendement thermique.',
      'En mode « rayons X », vous voyez le bloc V6, le turbo, le MGU-K, la batterie sous le réservoir et la boîte de vitesses à 8 rapports.',
    ],
    figures: [
      { label: 'Cylindrée', value: '1,6 L V6 turbo', note: 'régime max. 15 000 tr/min' },
      { label: 'MGU-K 2014-2025', value: '120 kW', note: '2 MJ récupérés / 4 MJ déployés par tour' },
      { label: 'MGU-K 2026', value: '350 kW', note: 'jusqu’à 8,5 MJ récupérés par tour' },
      { label: 'Moteur thermique 2026', value: '≈ 400 kW', note: 'soit une répartition proche de 50/50' },
    ],
    regulation: [
      { year: '2006', text: 'V8 2,4 L atmosphériques (V10 3,0 L jusqu’en 2005).' },
      { year: '2009', text: 'Premier KERS (60 kW, 400 kJ par tour).' },
      { year: '2014', text: 'Ère hybride : V6 1,6 L turbo, MGU-K et MGU-H, débit de carburant limité à 100 kg/h.' },
      { year: '2022', text: 'Carburant E10 (10 % d’éthanol durable), gel du développement moteur.' },
    ],
    y2026: 'MGU-H supprimé, MGU-K porté à 350 kW, environ 50 % de la puissance devient électrique. Carburant 100 % durable, débit limité en énergie (3000 MJ/h) et taux de compression ramené de 18:1 à 16:1. Arrivées d’Audi et de Red Bull Powertrains-Ford.',
    sheet: 'ers',
  },
}

export const PART_ORDER: PartId[] = [
  'frontWing',
  'cockpit',
  'halo',
  'wheels',
  'brakes',
  'suspension',
  'sidepods',
  'floor',
  'plank',
  'diffuser',
  'engineCover',
  'rearWing',
  'powerUnit',
]

/* ------------------------------------------------------------------ */
/* Sub-components (finest level of the 3D model)                       */
/* ------------------------------------------------------------------ */

export interface SubInfo {
  id: string
  part: PartId
  name: string
  /** One-sentence role. */
  role: string
  /** How it works. */
  how: string[]
  /** Materials and manufacturing. */
  materials: string
  figures: KeyFigure[]
  /** What the 2026 rules say / change. */
  y2026: string
  /** Modelling choices or regulatory points we are not sure about (shown as a caveat). */
  caveat?: string
}

type SubDef = Omit<SubInfo, 'id'>

const SUB_DEFS = {
  /* ---------------- Front wing ---------------- */
  'fw.main': {
    part: 'frontWing',
    name: 'Plan principal',
    role: 'Élément fixe le plus bas et le plus large de l’aileron : il porte l’essentiel de l’appui avant et sert de support au museau et aux volets.',
    how: [
      'Son profil cambré vers le bas accélère l’air sous l’aile ; très proche du sol, il profite en plus d’un effet de sol qui augmente l’appui à mesure que la voiture s’abaisse au freinage.',
      'Au centre, sous le museau, une section « neutre » imposée par le règlement produit peu d’appui : elle limite la sensibilité de la voiture qui suit aux remous de celle qui précède.',
    ],
    materials: 'Composite carbone/époxy pré-imprégné, cuit en autoclave, avec des inserts métalliques aux points de fixation.',
    figures: [
      { label: 'Garde au sol', value: '≈ 7-12 cm', note: 'selon la position sur l’envergure, en statique' },
      { label: 'Profil', value: 'cambré, inversé', note: 'type NACA à forte cambrure dans notre modèle' },
    ],
    y2026: 'Le plan principal reste fixe : seuls les volets bougent en mode X. L’aileron est environ 100 mm plus étroit qu’en 2025.',
    caveat: 'La forme exacte (hauteur du centre, raccord avec le museau) varie selon les équipes ; notre modèle choisit une forme plausible.',
  },
  'fw.flap1': {
    part: 'frontWing',
    name: 'Volet mobile inférieur',
    role: 'Premier volet derrière le plan principal : en mode Z (virage) il est très incliné pour l’appui, en mode X (ligne droite) il s’aplatit pour réduire la traînée.',
    how: [
      'La fente entre le plan principal et le volet injecte de l’air rapide sur l’extrados du volet : l’écoulement reste collé malgré un angle élevé. C’est le principe des volets d’atterrissage des avions.',
      'En 2026, ce volet pivote avec le second sous l’action d’un actionneur commandé par la voiture. Les deux ailerons basculent ensemble pour garder l’équilibre avant/arrière.',
    ],
    materials: 'Carbone/époxy, axe de rotation et paliers métalliques (alliage de titane ou acier).',
    figures: [
      { label: 'Mode Z', value: 'angle élevé', note: 'appui maximal en virage' },
      { label: 'Mode X', value: 'angle réduit', note: 'ligne droite, moins de traînée' },
      { label: 'Temps de bascule', value: '≈ quelques dixièmes de s', note: 'ordre de grandeur' },
    ],
    y2026: 'Nouveauté 2026 : aileron avant actif. Le pilote n’a plus besoin d’être à moins d’une seconde d’un adversaire : le mode X est disponible pour tous dans les zones désignées.',
    caveat: 'Les angles d’ouverture réels ne sont pas publiés ; l’animation montre une rotation plausible autour du bord d’attaque.',
  },
  'fw.flap2': {
    part: 'frontWing',
    name: 'Volet mobile supérieur',
    role: 'Élément le plus haut et le plus incliné de l’aileron avant, celui qui « règle » le plus l’appui de l’essieu avant.',
    how: [
      'Il travaille dans l’air déjà dévié par les deux premiers éléments : son incidence peut donc être très forte sans décrochage.',
      'Avant 2026, les mécaniciens modifiaient son angle à l’arrêt au stand (quelques tours de clé) pour corriger le sous-virage ou le survirage. En 2026 il bascule aussi en ligne droite avec le volet inférieur.',
    ],
    materials: 'Carbone/époxy ; bord de fuite très fin, sensible aux chocs.',
    figures: [
      { label: 'Réglage au stand', value: 'oui', note: 'angle de base, avant la bascule active' },
      { label: 'Mobile en course', value: 'oui (2026)', note: 'modes X / Z' },
    ],
    y2026: 'Fait partie de l’aéro active 2026. L’ouverture avant compense l’ouverture arrière : sans elle, la voiture deviendrait sous-vireuse à l’entrée des freinages.',
    caveat: 'Le nombre exact d’éléments et la répartition fixe/mobile peuvent différer du modèle (1 plan fixe + 2 volets mobiles ici).',
  },
  'fw.endplate': {
    part: 'frontWing',
    name: 'Plaque d’extrémité',
    role: 'Ferme le bout de l’aileron et dirige l’air autour de la roue avant.',
    how: [
      'Une aile finie laisse fuir l’air de la zone de surpression vers la zone de dépression par ses extrémités, ce qui crée un tourbillon et réduit l’appui. La plaque limite cette fuite.',
      'Ses découpes et son « pied » façonnent volontairement ce tourbillon pour pousser le sillage turbulent de la roue avant vers l’extérieur (outwash) ou l’intérieur (inwash).',
    ],
    materials: 'Carbone/époxy, souvent avec un pied (footplate) et des fentes usinées.',
    figures: [
      { label: 'Tourbillon', value: 'oui', note: 'il longe ensuite la roue et le flanc de la voiture' },
      { label: 'Découpes', value: '2 dans le modèle', note: 'fentes basses' },
    ],
    y2026: 'Plaques plus simples, avec moins de liberté de forme : l’objectif de la FIA est de réduire l’outwash qui rend la voiture suiveuse instable.',
    caveat: 'Découpes et pied dessinés de façon générique.',
  },
  'fw.actuator': {
    part: 'frontWing',
    name: 'Actionneur de l’aéro active',
    role: 'Fait basculer les volets avant entre le mode Z et le mode X.',
    how: [
      'Un vérin (hydraulique ou électrique) logé dans le museau entraîne des biellettes reliées à l’extrémité intérieure des volets, qui pivotent sur un axe.',
      'La commande est électronique : l’ouverture n’est autorisée que dans les zones prévues et se referme automatiquement au freinage ou à la demande du pilote, comme le DRS auparavant.',
    ],
    materials: 'Corps de vérin en aluminium ou titane, biellettes en titane, carénage carbone.',
    figures: [
      { label: 'Position', value: 'dans le museau', note: 'à l’abri de l’écoulement' },
      { label: 'Commande', value: 'électronique', note: 'boîtier standard de la FIA' },
    ],
    y2026: 'Organe nouveau en 2026 : il doit être fiable, rapide et ne pas alourdir le museau, qui doit lui-même passer les crash-tests.',
    caveat: 'L’architecture interne réelle (type de vérin, cinématique) n’est pas publique ; la représentation est schématique.',
  },

  /* ---------------- Cockpit / chassis ---------------- */
  'ck.nose': {
    part: 'cockpit',
    name: 'Museau (structure d’impact avant)',
    role: 'Absorbe l’énergie d’un choc frontal avant qu’elle n’atteigne la cellule de survie, et porte l’aileron avant.',
    how: [
      'C’est un tube conique en carbone conçu pour s’écraser progressivement : les couches de fibre se délaminent et se rompent en absorbant l’énergie.',
      'Haut et fin, il laisse passer un maximum d’air sous la voiture vers le fond plat, l’élément aérodynamique le plus important.',
    ],
    materials: 'Composite carbone, empilement dimensionné pour l’écrasement contrôlé ; pointe parfois renforcée.',
    figures: [
      { label: 'Crash-test', value: 'homologation FIA', note: 'chariot lancé contre un mur, décélération limitée' },
      { label: 'Hauteur de la pointe', value: '≈ 18 cm', note: 'dans notre modèle' },
    ],
    y2026: 'Structure d’impact en deux étages : après un premier choc, une partie reste en place pour protéger le pilote lors d’un second impact (accident en chaîne).',
  },
  'ck.tub': {
    part: 'cockpit',
    name: 'Monocoque (cellule de survie)',
    role: 'Le cœur structurel de la voiture : elle protège le pilote et le réservoir et sert de point d’ancrage au moteur, à la suspension avant et au halo.',
    how: [
      'Elle est faite de peaux en carbone collées sur un nid d’abeille d’aluminium : un sandwich très rigide et très léger. Le moteur y est boulonné directement et participe à la rigidité de l’ensemble (moteur porteur).',
      'Des panneaux en Zylon, une fibre anti-perforation, recouvrent ses flancs. Le réservoir souple est logé juste derrière le siège.',
    ],
    materials: 'Carbone/époxy et nid d’abeille d’aluminium, panneaux anti-intrusion en Zylon, inserts en titane.',
    figures: [
      { label: 'Masse', value: '≈ 35-45 kg', note: 'ordre de grandeur, nue' },
      { label: 'Masse min. voiture 2026', value: '768 kg', note: 'pilote compris, sans carburant' },
    ],
    y2026: 'Voiture plus courte et plus étroite ; protections latérales renforcées et charges d’homologation accrues sur plusieurs tests statiques.',
  },
  'ck.driver': {
    part: 'cockpit',
    name: 'Pilote et casque',
    role: 'Le pilote, allongé dans la monocoque, ne laisse dépasser que son casque, protégé par le halo.',
    how: [
      'Le casque, homologué selon la norme FIA 8860, combine une calotte en carbone et des couches absorbantes ; il est relié au système HANS qui retient la tête lors d’une décélération brutale.',
      'La visière, teintée par temps sec, est recouverte de films détachables (« tear-offs ») que le pilote arrache quand ils sont sales. Un petit aileron à l’arrière stabilise le casque à haute vitesse.',
    ],
    materials: 'Calotte carbone/aramide, mousses absorbantes, visière en polycarbonate, combinaison en Nomex ignifugé.',
    figures: [
      { label: 'Masse du casque', value: '≈ 1,2-1,4 kg' },
      { label: 'Charge sur le cou', value: 'jusqu’à ≈ 5-6 g', note: 'en virage et au freinage' },
      { label: 'Masse min. pilote', value: '80 kg', note: 'avec siège et équipement, lest ajouté si besoin' },
    ],
    y2026: 'Pas de changement de principe ; la masse minimale du pilote équipé reste un élément du calcul de la masse minimale de la voiture.',
  },
  'ck.steering': {
    part: 'cockpit',
    name: 'Volant',
    role: 'Commande de direction et véritable tableau de bord : écran, palettes de vitesses et d’embrayage, molettes de réglage.',
    how: [
      'Le pilote y change en roulant la répartition de freinage, le différentiel, les modes de déploiement de l’énergie, le frein moteur… Une vingtaine de boutons et molettes, plus un écran.',
      'Il est amovible (moyeu à déverrouillage rapide) pour permettre au pilote de sortir en moins de 5 secondes.',
    ],
    materials: 'Corps en carbone, électronique embarquée, poignées moulées à la main du pilote.',
    figures: [
      { label: 'Commandes', value: '≈ 20-25', note: 'boutons, molettes et palettes' },
      { label: 'Masse', value: '≈ 1,3 kg' },
    ],
    y2026: 'Nouvelles commandes liées à la gestion de l’énergie (mode « override » pour dépasser) et à l’aéro active, dont la bascule est largement automatisée.',
    caveat: 'Le dessin est générique ; la répartition des commandes varie selon les équipes.',
  },
  'ck.mirrors': {
    part: 'cockpit',
    name: 'Rétroviseurs',
    role: 'Permettre au pilote de voir derrière lui, une exigence de sécurité.',
    how: [
      'Leur surface réfléchissante minimale et leur position sont imposées. Les équipes optimisent leurs supports, profilés comme de petites ailes, car ils sont dans un écoulement rapide.',
      'Leur carénage perturbe l’air qui va vers les pontons : leur emplacement est un compromis entre visibilité et aérodynamique.',
    ],
    materials: 'Coque carbone, miroir en verre ou polymère, supports profilés en carbone.',
    figures: [{ label: 'Supports', value: 'profilés', note: 'dans le modèle : deux bras, vers la monocoque et le ponton' }],
    y2026: 'Les exigences de visibilité restent ; la forme plus étroite de la voiture 2026 rapproche les rétroviseurs de la monocoque.',
    caveat: 'Dimensions minimales exactes du miroir non reproduites ici.',
  },
  'ck.antennas': {
    part: 'cockpit',
    name: 'Antennes',
    role: 'Liaisons radio et télémétrie entre la voiture, le stand et la direction de course.',
    how: [
      'La voiture transmet en continu des centaines de paramètres (températures, pressions, positions) au stand. Elle reçoit aussi les messages officiels (drapeaux, voiture de sécurité) affichés sur le volant.',
      'Un système GPS et des balises de chronométrage complètent l’équipement.',
    ],
    materials: 'Tiges fines en composite, embases en aluminium.',
    figures: [
      { label: 'Capteurs', value: 'plusieurs centaines', note: 'ordre de grandeur' },
      { label: 'Télémétrie', value: 'en temps réel' },
    ],
    y2026: 'Pas de changement majeur visible.',
  },

  /* ---------------- Halo ---------------- */
  'halo.structure': {
    part: 'halo',
    name: 'Arceau en titane',
    role: 'Structure en titane qui dévie roues et débris loin de la tête du pilote.',
    how: [
      'Un tube fixé en deux points derrière le cockpit et en un point central devant (le pilier), formant un « Y » vu de dessus.',
      'Il doit résister à une charge de plusieurs tonnes appliquée par le dessus et de côté sans se rompre ni s’arracher de la monocoque.',
    ],
    materials: 'Titane grade 5 (Ti-6Al-4V), fabriqué par trois fournisseurs homologués par la FIA.',
    figures: [
      { label: 'Masse', value: '≈ 7 kg' },
      { label: 'Charge testée', value: '≈ 12 t', note: 'ordre de grandeur, verticale' },
    ],
    y2026: 'Toujours obligatoire ; charges d’homologation encore relevées avec la nouvelle réglementation.',
  },
  'halo.fairing': {
    part: 'halo',
    name: 'Carénage du halo',
    role: 'Petit habillage aérodynamique qui réduit la perturbation créée par le tube devant l’airbox.',
    how: [
      'Un tube rond produit un sillage turbulent juste devant l’entrée d’air du moteur et l’aileron arrière. Le règlement autorise un carénage profilé de dimensions limitées.',
      'Il sert aussi de support aux couleurs de l’équipe, voire de petites ouïes de refroidissement pour le pilote.',
    ],
    materials: 'Carbone, collé ou vissé sur l’arceau.',
    figures: [{ label: 'Rôle', value: 'aérodynamique', note: 'non structurel' }],
    y2026: 'Les zones de carénage autorisées restent limitées.',
  },
} satisfies Record<string, SubDef>

const SUB_DEFS_CHASSIS = {
  /* ---------------- Wheels ---------------- */
  'wh.tyre': {
    part: 'wheels',
    name: 'Pneu',
    role: 'Seul contact avec la piste : il transmet toutes les forces de la voiture.',
    how: [
      'Le pneu slick n’a pas de rainures : toute la surface de la bande de roulement colle au bitume. La gomme doit être dans sa fenêtre de température pour adhérer.',
      'Le flanc, plus bas depuis les jantes de 18 pouces, se déforme moins qu’avant : la suspension travaille davantage et les pneus surchauffent moins en se déformant.',
    ],
    materials: 'Gomme (mélanges C1 à C6 selon le Grand Prix), carcasse textile et acier, fournisseur unique Pirelli.',
    figures: [
      { label: 'Largeur 2026', value: '280 / 375 mm', note: 'avant / arrière (305 / 405 mm en 2025)' },
      { label: 'Diamètre 2026', value: '≈ 705 / 710 mm', note: 'avant / arrière (720 mm en 2025)' },
      { label: 'Mélanges secs', value: '3 par GP', note: 'parmi six' },
    ],
    y2026: 'Pneus plus étroits et un peu plus petits pour réduire la masse et la traînée.',
    caveat: 'Le liseré de couleur est générique (rouge = tendre) ; le modèle ne reproduit pas les marquages du manufacturier.',
  },
  'wh.rim': {
    part: 'wheels',
    name: 'Jante à rayons',
    role: 'Porte le pneu et transmet le couple de freinage et d’accélération.',
    how: [
      'Jante de 18 pouces forgée, à rayons, fournie à toutes les équipes par un fabricant unique : elle ne peut pas servir de différenciation.',
      'Elle s’échauffe avec les freins : la chaleur des disques passe dans la jante et dans le pneu. Les équipes gèrent ce flux via les écopes de frein pour réchauffer ou refroidir les pneus.',
    ],
    materials: 'Alliage de magnésium forgé et usiné.',
    figures: [
      { label: 'Diamètre', value: '18 pouces', note: 'depuis 2022' },
      { label: 'Rayons', value: '10 dans le modèle' },
    ],
    y2026: 'Jantes de 18 pouces conservées.',
    caveat: 'Le dessin exact des rayons est générique.',
  },
  'wh.cover': {
    part: 'wheels',
    name: 'Enjoliveur',
    role: 'Carénage plein sur la face extérieure de la jante, qui lisse l’écoulement autour de la roue.',
    how: [
      'Une roue qui tourne brasse l’air comme un ventilateur. En fermant la jante, l’enjoliveur réduit ce brassage et le sillage turbulent envoyé vers le fond plat et la voiture qui suit.',
      'Il ne tourne pas indépendamment : il est fixé à la jante. Dans la vue éclatée, il s’écarte pour révéler les rayons.',
    ],
    materials: 'Carbone ou composite léger, fixation rapide pour les arrêts au stand.',
    figures: [{ label: 'Introduits', value: '2022', note: 'avec les jantes de 18 pouces' }],
    y2026: 'La forme exacte des enjoliveurs pour 2026 est définie par le règlement ; notre modèle en montre une version simple.',
    caveat: 'Nous ne sommes pas certains du maintien ou de la forme exacte des enjoliveurs imposés en 2026 : à vérifier dans le règlement technique en vigueur.',
  },
  'wh.nut': {
    part: 'wheels',
    name: 'Écrou central',
    role: 'Un seul écrou par roue, pour des changements en moins de 2 secondes.',
    how: [
      'Le mécanicien le dévisse et le revisse avec un pistolet pneumatique ; l’écrou reste prisonnier de la roue pour gagner du temps.',
      'Un système de retenue mécanique empêche la roue de se détacher si l’écrou est mal serré : la voiture ne peut pas repartir avec une roue mal fixée sans risque de sanction.',
    ],
    materials: 'Titane ou aluminium haute résistance, avec dispositif de retenue.',
    figures: [{ label: 'Arrêt record', value: '1,80 s', note: 'McLaren, Qatar 2023' }],
    y2026: 'Principe inchangé.',
  },

  /* ---------------- Brakes ---------------- */
  'br.disc': {
    part: 'brakes',
    name: 'Disque ventilé',
    role: 'Transforme l’énergie cinétique en chaleur par frottement contre les plaquettes.',
    how: [
      'Le disque carbone-carbone est percé de plus d’un millier de petits canaux radiaux : l’air qui les traverse évacue la chaleur.',
      'Il n’est efficace qu’à chaud (au-delà de 300-400 °C) et peut dépasser 1000 °C au freinage le plus violent. Trop chaud, il s’use très vite.',
    ],
    materials: 'Carbone-carbone (fibres de carbone dans une matrice de carbone), fabriqué en plusieurs mois.',
    figures: [
      { label: 'Diamètre avant', value: '≈ 328 mm', note: 'depuis 2022' },
      { label: 'Épaisseur', value: '≈ 32 mm' },
      { label: 'Canaux', value: '> 1000', note: 'ventilation' },
    ],
    y2026: 'À l’arrière, une part plus grande du freinage est assurée par le MGU-K (350 kW) : le disque arrière travaille moins, mais la transition entre freinage électrique et hydraulique doit être parfaite.',
  },
  'br.caliper': {
    part: 'brakes',
    name: 'Étrier',
    role: 'Serre les plaquettes contre le disque sous l’action de la pression hydraulique.',
    how: [
      'Des pistons poussent les plaquettes de chaque côté du disque. L’étrier doit rester extrêmement rigide pour que la pédale reste ferme malgré la chaleur.',
      'À l’arrière, le système « brake-by-wire » calcule la pression à appliquer en fonction de la récupération d’énergie du MGU-K.',
    ],
    materials: 'Alliage d’aluminium-lithium usiné dans la masse, plaquettes en carbone-carbone.',
    figures: [
      { label: 'Pistons', value: '6 max.', note: 'par étrier' },
      { label: 'Effort pédale', value: '≈ 100-160 kg', note: 'au freinage le plus fort, ordre de grandeur' },
    ],
    y2026: 'Pas de changement de principe ; la stratégie de récupération électrique pèse plus lourd à l’arrière.',
  },
  'br.duct': {
    part: 'brakes',
    name: 'Écope de frein et tambour',
    role: 'Capte l’air frais pour refroidir disque et étrier, et règle la température des jantes et des pneus.',
    how: [
      'L’écope, côté intérieur de la roue, alimente un tambour en carbone qui entoure le disque. Les équipes changent la taille de l’entrée selon le circuit (plus ouvert à Montréal, plus fermé à Silverstone).',
      'Depuis 2022 leur forme est fortement encadrée : elles servaient auparavant de véritables dispositifs aérodynamiques.',
    ],
    materials: 'Carbone, tambour en carbone avec isolation thermique.',
    figures: [{ label: 'Réglage', value: 'par circuit', note: 'plusieurs tailles d’entrée' }],
    y2026: 'Les écopes restent très encadrées pour limiter les gains aérodynamiques.',
    caveat: 'Forme d’écope simplifiée.',
  },
} satisfies Record<string, SubDef>

const SUSPENSION_COMMON =
  'Les triangles sont profilés comme des ailes : ils sont dans l’écoulement, juste derrière l’aileron avant (ou devant le diffuseur), et leur angle influence l’air qui va vers le fond plat.'

const SUB_DEFS_SUSPENSION = {
  'sus.f.upper': {
    part: 'suspension',
    name: 'Triangle supérieur avant',
    role: 'Bras en « A » qui guide le haut du porte-moyeu avant.',
    how: [
      'Avec le triangle inférieur, il fixe la géométrie de la roue : carrossage, chasse, centre de roulis. Ses points d’ancrage sur la monocoque déterminent aussi l’effet « anti-plongée » au freinage.',
      SUSPENSION_COMMON,
    ],
    materials: 'Carbone, rotules et chapes en titane.',
    figures: [
      { label: 'Branches', value: '2', note: 'vers l’avant et vers l’arrière' },
      { label: 'Profil', value: 'aile symétrique', note: 'carénage aérodynamique' },
    ],
    y2026: 'Architecture libre (push-rod ou pull-rod) ; la voiture plus courte oblige à repenser les points d’ancrage.',
  },
  'sus.f.lower': {
    part: 'suspension',
    name: 'Triangle inférieur avant',
    role: 'Bras en « A » qui reprend l’essentiel des efforts verticaux et longitudinaux de la roue avant.',
    how: [
      'C’est sur lui (ou sur le porte-moyeu à sa base) que s’appuie la tige de poussée : il transmet la charge de la roue vers les ressorts logés dans la monocoque.',
      SUSPENSION_COMMON,
    ],
    materials: 'Carbone, rotules en titane.',
    figures: [{ label: 'Hauteur', value: '≈ 15-20 cm', note: 'côté monocoque, dans le modèle' }],
    y2026: 'Mêmes principes ; la hauteur des ancrages est contrainte par le museau et la monocoque plus étroits.',
  },
  'sus.f.pushrod': {
    part: 'suspension',
    name: 'Tige de poussée (push-rod)',
    role: 'Transmet le mouvement vertical de la roue avant à un culbuteur qui actionne ressorts et amortisseurs dans la monocoque.',
    how: [
      'Elle part du bas du porte-moyeu et monte en diagonale vers le haut de la monocoque : quand la roue monte, la tige pousse le culbuteur.',
      'À l’avant, le push-rod est le choix le plus courant : les éléments internes sont logés en haut du châssis, faciles d’accès, et la tige est bien placée dans l’écoulement.',
    ],
    materials: 'Carbone ou titane, extrémités en titane.',
    figures: [{ label: 'Choix du modèle', value: 'push-rod à l’avant' }],
    y2026: 'Le choix push-rod / pull-rod reste libre en 2026 ; le push-rod avant est l’architecture la plus répandue sur la période récente.',
    caveat: 'Choix d’architecture fait pour le modèle : le règlement autorise aussi le pull-rod à l’avant.',
  },
  'sus.f.trackrod': {
    part: 'suspension',
    name: 'Biellette de direction',
    role: 'Relie la crémaillère de direction au porte-moyeu pour braquer la roue avant.',
    how: [
      'Quand le pilote tourne le volant, la crémaillère translate et la biellette fait pivoter le porte-moyeu autour de l’axe des rotules (axe de pivot). Utilisez le curseur « Braquage » pour la voir bouger.',
      'Sa position (devant ou derrière l’axe de roue, en ligne avec un triangle) est un choix aérodynamique autant que mécanique.',
    ],
    materials: 'Carbone ou titane, rotules en acier.',
    figures: [
      { label: 'Angle de braquage', value: '≈ ±20°', note: 'ordre de grandeur, maximal en épingle' },
      { label: 'Direction assistée', value: 'hydraulique' },
    ],
    y2026: 'Pas de changement de principe.',
  },
  'sus.f.upright': {
    part: 'suspension',
    name: 'Porte-moyeu avant',
    role: 'Pièce qui porte le roulement de roue et l’étrier de frein, et sur laquelle s’articulent les triangles.',
    how: [
      'Il pivote avec la direction. Il doit être très rigide (pour garder le carrossage sous charge) et très léger, car c’est une masse non suspendue.',
      'Il loge aussi le canal de l’écope de frein et parfois des capteurs de température.',
    ],
    materials: 'Titane ou alliage d’aluminium usiné, parfois fabrication additive (impression 3D métal).',
    figures: [{ label: 'Masse non suspendue', value: 'à minimiser', note: 'roue + frein + porte-moyeu' }],
    y2026: 'Principe inchangé.',
  },
  'sus.r.upper': {
    part: 'suspension',
    name: 'Triangle supérieur arrière',
    role: 'Guide le haut du porte-moyeu arrière ; sur notre modèle, il porte aussi la tige de traction.',
    how: [
      'Ses ancrages sont sur le carter de boîte de vitesses, qui sert de structure arrière. La géométrie règle l’« anti-cabrage » à l’accélération.',
      SUSPENSION_COMMON,
    ],
    materials: 'Carbone, rotules en titane.',
    figures: [{ label: 'Ancrage', value: 'carter de boîte' }],
    y2026: 'Voiture plus courte : la position de la boîte et des ancrages est revue.',
  },
  'sus.r.lower': {
    part: 'suspension',
    name: 'Triangle inférieur arrière',
    role: 'Reprend les efforts de la roue arrière, notamment la poussée motrice.',
    how: [
      'Il est placé juste au-dessus du fond plat, devant le diffuseur : sa forme influence l’écoulement qui alimente le diffuseur.',
      SUSPENSION_COMMON,
    ],
    materials: 'Carbone, rotules en titane.',
    figures: [{ label: 'Position', value: 'au ras du fond' }],
    y2026: 'Sans aileron de poutre (beam wing), l’écoulement autour des bras arrière devient plus important pour l’extraction du diffuseur.',
  },
  'sus.r.pullrod': {
    part: 'suspension',
    name: 'Tige de traction (pull-rod)',
    role: 'Transmet le mouvement de la roue arrière à un culbuteur placé bas, au niveau de la boîte.',
    how: [
      'Elle part du haut du porte-moyeu et descend vers le bas du carter : quand la roue monte, la tige tire le culbuteur.',
      'À l’arrière, le pull-rod abaisse les masses (ressorts, amortisseurs) et libère le haut de la carrosserie autour de la boîte : un capot plus fin vers l’aileron arrière.',
    ],
    materials: 'Carbone ou titane.',
    figures: [{ label: 'Choix du modèle', value: 'pull-rod à l’arrière' }],
    y2026: 'Architecture libre. Le pull-rod arrière est un choix répandu depuis des années ; certaines équipes passent au push-rod.',
    caveat: 'Choix fait pour le modèle, pas une obligation réglementaire.',
  },
  'sus.r.toelink': {
    part: 'suspension',
    name: 'Biellette de pincement',
    role: 'Fixe l’angle de pincement de la roue arrière (elle ne braque pas).',
    how: [
      'C’est l’équivalent arrière de la biellette de direction, mais reliée à un point fixe du carter : elle empêche la roue de pivoter.',
      'Sa longueur, réglée au garage, fixe le pincement (toe), qui influe sur la stabilité et l’usure des pneus.',
    ],
    materials: 'Carbone ou titane, rotules en acier.',
    figures: [{ label: 'Réglage', value: 'quelques dixièmes de degré' }],
    y2026: 'Principe inchangé ; les roues arrière directrices restent interdites.',
  },
  'sus.r.upright': {
    part: 'suspension',
    name: 'Porte-moyeu arrière',
    role: 'Porte le roulement, le frein arrière et reçoit l’arbre de transmission.',
    how: [
      'L’arbre de roue, venant du différentiel, traverse le porte-moyeu. Il doit encaisser le couple combiné du moteur thermique et du MGU-K.',
      'Comme à l’avant, il loge l’étrier et les conduits de refroidissement.',
    ],
    materials: 'Titane ou aluminium usiné, parfois imprimé en 3D.',
    figures: [{ label: 'Couple transmis', value: 'élevé', note: 'thermique + électrique' }],
    y2026: 'Le couple électrique plus important (MGU-K 350 kW) sollicite davantage la transmission.',
  },
} satisfies Record<string, SubDef>

const SUB_DEFS_AERO = {
  /* ---------------- Sidepods ---------------- */
  'sp.body': {
    part: 'sidepods',
    name: 'Carrosserie du ponton',
    role: 'Enveloppe des radiateurs, sculptée pour guider l’air vers l’arrière et vers le bord du fond plat.',
    how: [
      'Sous l’entrée d’air, une découpe profonde (undercut) laisse passer un flux rapide qui longe le bas du ponton et alimente le bord du fond plat et le diffuseur.',
      'Le dessus descend vers l’arrière en rampe (downwash) et se resserre en « bouteille de Coca » autour de la boîte : l’air accéléré vient balayer le haut du diffuseur.',
    ],
    materials: 'Panneaux carbone fins, démontables, avec structure d’impact latérale intégrée.',
    figures: [
      { label: 'Undercut', value: 'profond', note: 'creusement sous l’entrée d’air' },
      { label: 'Fonction', value: 'refroidissement + aéro' },
    ],
    y2026: 'Voiture plus étroite et nouveaux besoins de refroidissement (batterie et MGU-K plus sollicités, moteur thermique moins puissant) : les pontons changent de proportions.',
    caveat: 'Forme générique, ni « zéropod » ni concept d’une équipe précise.',
  },
  'sp.inlet': {
    part: 'sidepods',
    name: 'Entrée d’air',
    role: 'Bouche qui capte l’air de refroidissement des radiateurs (eau, huile, intercooler, électronique).',
    how: [
      'L’air ralentit dans un conduit qui s’élargit (diffuseur interne), traverse le faisceau du radiateur, puis ressort chaud par les ouïes et l’arrière de la carrosserie.',
      'Plus la bouche est grande, plus on refroidit, mais plus on crée de traînée : les équipes apportent plusieurs tailles selon la chaleur et l’altitude du circuit.',
    ],
    materials: 'Lèvre en carbone, conduit interne en carbone, radiateurs en aluminium.',
    figures: [{ label: 'Taille', value: 'variable', note: 'selon circuit et météo' }],
    y2026: 'Les radiateurs basse température (électronique, batterie) prennent plus d’importance avec un MGU-K de 350 kW.',
  },
  'sp.louvres': {
    part: 'sidepods',
    name: 'Ouïes de refroidissement',
    role: 'Fentes qui évacuent l’air chaud sorti des radiateurs.',
    how: [
      'L’air chaud doit sortir là où la pression extérieure est basse pour « aspirer » le flux à travers les radiateurs.',
      'Les équipes ouvrent ou ferment ces panneaux selon la chaleur : un capot plus fermé réduit la traînée.',
    ],
    materials: 'Panneaux carbone interchangeables.',
    figures: [{ label: 'Panneaux', value: 'interchangeables' }],
    y2026: 'Pas de changement de principe.',
  },

  /* ---------------- Floor ---------------- */
  'fl.floor': {
    part: 'floor',
    name: 'Fond plat et canaux Venturi',
    role: 'Grande surface sous la voiture : deux canaux qui se resserrent puis s’élargissent créent une forte dépression.',
    how: [
      'À l’entrée, le toit des canaux est haut ; il descend jusqu’au col (le point le plus bas), où l’air est le plus rapide et la pression la plus basse, puis remonte vers le diffuseur.',
      'Un bord plat et un rebord relevé limitent les fuites d’air depuis les côtés. Vue de dessous (vue « dessous » de la soufflerie), on distingue la quille centrale qui porte la planche.',
    ],
    materials: 'Carbone, nid d’abeille ; renforts pour résister aux tests de flexion.',
    figures: [
      { label: 'Part de l’appui', value: 'majoritaire', note: '2022-2025 ; un peu moins en 2026' },
      { label: 'Canaux', value: '2', note: 'gauche et droite de la quille' },
    ],
    y2026: 'Fond « partiellement plat » : canaux d’entrée plus courts, diffuseur plus petit. Moins d’appui, mais une voiture moins sensible à la hauteur de caisse et moins sujette au marsouinage.',
    caveat: 'Hauteurs et longueurs des canaux choisies de façon plausible, sans les cotes exactes du règlement.',
  },
  'fl.fences': {
    part: 'floor',
    name: 'Ailettes d’entrée (fences)',
    role: 'Lames verticales sous le bord d’attaque du fond, qui orientent l’air dans les canaux.',
    how: [
      'Elles séparent l’écoulement en filets et créent des tourbillons qui scellent les canaux, un peu comme des jupes invisibles.',
      'Leur courbure, vers l’extérieur, chasse aussi le sillage des roues avant loin de l’entrée du fond.',
    ],
    materials: 'Carbone.',
    figures: [{ label: 'Nombre', value: '4 par côté', note: 'dans le modèle' }],
    y2026: 'Toujours présentes ; leur nombre et leur forme sont encadrés.',
    caveat: 'Nombre et forme indicatifs.',
  },
  'fl.edge': {
    part: 'floor',
    name: 'Ailette de bord (edge wing)',
    role: 'Petit élément profilé le long du bord du fond, qui génère un tourbillon de bord.',
    how: [
      'Ce tourbillon, qui court le long du fond, agit comme une jupe : il empêche l’air extérieur à pression ambiante d’entrer sous la voiture.',
      'Plus il est stable, moins le fond perd d’appui quand la voiture roule, tangue ou passe sur un vibreur.',
    ],
    materials: 'Carbone, supports fins.',
    figures: [{ label: 'Effet', value: 'jupe aérodynamique', note: 'tourbillon de bord' }],
    y2026: 'Les règles 2026 définissent la zone du bord du fond où ces éléments sont autorisés.',
    caveat: 'Forme et position de l’ailette de bord représentées de façon générique.',
  },
  'fl.boards': {
    part: 'floor',
    name: 'Déflecteurs de sillage',
    role: 'Plaques verticales à l’avant du fond, devant les pontons, qui écartent le sillage des roues avant.',
    how: [
      'Le sillage turbulent des roues avant risque d’entrer sous la voiture. Ces déflecteurs le repoussent et créent un tourbillon qui protège l’entrée du fond.',
      'Ils rappellent les « bargeboards » d’avant 2022, mais avec une forme beaucoup plus encadrée.',
    ],
    materials: 'Carbone.',
    figures: [{ label: 'Position', value: 'coin avant du fond' }],
    y2026: 'Le règlement 2026 réintroduit des éléments de ce type à l’avant du fond.',
    caveat: 'Nous ne sommes pas sûrs de la forme exacte autorisée : la plaque est volontairement simple.',
  },

  /* ---------------- Plank ---------------- */
  'pk.plank': {
    part: 'plank',
    name: 'Planche',
    role: 'Planche de bois composite sous la quille : mesurée après la course, elle prouve que la voiture n’a pas roulé trop bas.',
    how: [
      'Elle s’use au contact de la piste. Si son épaisseur, mesurée aux trous de contrôle, est inférieure à la tolérance, la voiture est disqualifiée.',
      'Elle oblige les équipes à garder une marge de hauteur, au détriment de l’effet de sol.',
    ],
    materials: 'Bois stratifié densifié (type Jabroc).',
    figures: [
      { label: 'Épaisseur neuve', value: '10 mm' },
      { label: 'Minimum', value: '9 mm', note: 'après la course' },
    ],
    y2026: 'Toujours en place.',
  },
  'pk.skids': {
    part: 'plank',
    name: 'Patins en titane',
    role: 'Plaques métalliques encastrées dans la planche, qui limitent son usure.',
    how: [
      'Quand la voiture touche le sol, ce sont eux qui frottent : d’où les gerbes d’étincelles.',
      'Le titane a été imposé en 2015 (à la place du tungstène) en partie pour ce spectacle.',
    ],
    materials: 'Titane.',
    figures: [{ label: 'Depuis', value: '2015', note: 'titane imposé' }],
    y2026: 'Inchangé.',
  },

  /* ---------------- Diffuser ---------------- */
  'df.ramp': {
    part: 'diffuser',
    name: 'Rampe du diffuseur',
    role: 'Toit des canaux qui remonte à l’arrière : l’air ralentit et retrouve la pression ambiante.',
    how: [
      'La remontée progressive de pression permet d’entretenir la dépression sous le fond : c’est la « pompe » du fond plat.',
      'Si la rampe est trop raide, l’écoulement décolle et l’effet disparaît : l’angle et la hauteur de sortie sont limités.',
    ],
    materials: 'Carbone.',
    figures: [{ label: 'Hauteur de sortie', value: '≈ 26 cm', note: 'dans notre modèle' }],
    y2026: 'Diffuseur plus petit (hauteur de sortie réduite) et sans aileron de poutre pour l’aider : moins d’appui, sillage moins violent.',
    caveat: 'La hauteur réelle de sortie 2026 n’est pas reproduite exactement.',
  },
  'df.strakes': {
    part: 'diffuser',
    name: 'Cloisons du diffuseur',
    role: 'Lames verticales qui stabilisent l’écoulement dans le diffuseur et y ancrent des tourbillons.',
    how: [
      'Elles empêchent l’air de dériver latéralement dans le diffuseur et entretiennent des tourbillons qui retardent le décollement.',
      'Les parois extérieures ferment le diffuseur face au sillage des roues arrière.',
    ],
    materials: 'Carbone.',
    figures: [{ label: 'Cloisons', value: '5 + 2 parois', note: 'dans le modèle' }],
    y2026: 'Nombre et forme encadrés par le règlement.',
    caveat: 'Disposition indicative.',
  },

  /* ---------------- Rear wing ---------------- */
  'rw.main': {
    part: 'rearWing',
    name: 'Plan principal arrière',
    role: 'Élément fixe de l’aileron arrière, qui crée l’appui de l’essieu arrière.',
    how: [
      'Placé haut, dans de l’air peu perturbé, il est efficace mais coûteux en traînée. Il aide aussi à « aspirer » l’air qui sort du diffuseur.',
      'Sa forme légèrement creusée au centre (en cuillère) répartit la charge sur l’envergure.',
    ],
    materials: 'Carbone/époxy.',
    figures: [{ label: 'Envergure', value: '≈ 1 m', note: 'dans le modèle' }],
    y2026: 'L’aileron arrière 2026 n’a plus d’aileron de poutre (beam wing) en dessous.',
  },
  'rw.flap': {
    part: 'rearWing',
    name: 'Volet mobile arrière',
    role: 'Volet supérieur qui pivote : fermé en virage (mode Z), ouvert en ligne droite (mode X).',
    how: [
      'En s’ouvrant, il réduit fortement l’incidence de l’aileron : la traînée chute, la vitesse de pointe augmente. Il pivote près de son bord de fuite, comme le DRS de 2011-2025.',
      'Contrairement au DRS, il n’est plus réservé au dépassement : tous les pilotes l’utilisent dans les zones prévues, et l’avant bascule en même temps.',
    ],
    materials: 'Carbone, axe et paliers métalliques.',
    figures: [
      { label: 'DRS 2011-2025', value: '85 mm max.', note: 'ouverture du volet' },
      { label: 'Mode X', value: 'tous les pilotes', note: 'zones définies' },
    ],
    y2026: 'Aéro active : le volet arrière ouvert en ligne droite réduit la traînée, nécessaire avec un moteur thermique moins puissant et une énergie électrique limitée.',
    caveat: 'Angle et cinématique d’ouverture indicatifs.',
  },
  'rw.endplate': {
    part: 'rearWing',
    name: 'Plaque d’extrémité arrière',
    role: 'Ferme les côtés de l’aileron arrière et contrôle le tourbillon d’extrémité.',
    how: [
      'Le tourbillon d’extrémité coûte de la traînée induite. Des découpes (louvres) en haut de la plaque l’affaiblissent.',
      'Depuis 2022, les plaques sont arrondies et se raccordent au plan principal pour projeter le sillage vers le haut, au-dessus de la voiture qui suit.',
    ],
    materials: 'Carbone.',
    figures: [{ label: 'Louvres', value: '3 + 1 fente', note: 'dans le modèle' }],
    y2026: 'Forme simplifiée. Des feux supplémentaires y sont intégrés en 2026 (voir « Feux arrière »).',
  },
  'rw.actuator': {
    part: 'rearWing',
    name: 'Actionneur arrière',
    role: 'Vérin qui fait pivoter le volet arrière.',
    how: [
      'Logé dans un petit carénage au-dessus du plan principal, il pousse le volet à son centre. Il doit le refermer en une fraction de seconde au freinage.',
      'Il est commandé par le boîtier électronique standard, synchronisé avec l’actionneur avant.',
    ],
    materials: 'Corps métallique, carénage carbone.',
    figures: [{ label: 'Commande', value: 'électronique standard' }],
    y2026: 'Utilisé beaucoup plus souvent qu’un DRS : à chaque ligne droite désignée, pour tous les pilotes.',
  },
  'rw.pylon': {
    part: 'rearWing',
    name: 'Mât central',
    role: 'Double lame qui porte l’aileron depuis la structure d’impact arrière.',
    how: [
      'Sans aileron de poutre, l’aileron arrière est tenu par un support central qui doit résister à plusieurs centaines de kilos d’appui sans fléchir.',
      'Des tests de flexion statiques contrôlent qu’il ne s’incline pas pour réduire la traînée à haute vitesse.',
    ],
    materials: 'Carbone, inserts en titane.',
    figures: [{ label: 'Charge', value: 'centaines de kg', note: 'à haute vitesse' }],
    y2026: 'Suppression du beam wing : le support doit reprendre seul les efforts.',
    caveat: 'Forme du mât générique.',
  },
  'rw.crash': {
    part: 'rearWing',
    name: 'Structure d’impact arrière',
    role: 'Caisson en carbone derrière la boîte de vitesses, qui absorbe un choc arrière.',
    how: [
      'Comme le museau, il s’écrase progressivement pour limiter la décélération subie par le pilote.',
      'Il porte le feu arrière et sert de support au mât de l’aileron.',
    ],
    materials: 'Composite carbone homologué par crash-test.',
    figures: [{ label: 'Homologation', value: 'crash-test FIA' }],
    y2026: 'Nouvelles exigences d’absorption avec la réglementation 2026.',
  },
  'rw.light': {
    part: 'rearWing',
    name: 'Feux arrière',
    role: 'Feu rouge central pour la pluie et le brouillard, et feux sur les plaques d’extrémité.',
    how: [
      'Le feu central s’allume sous la pluie et en cas de faible visibilité. Il peut aussi clignoter quand la voiture récupère de l’énergie, pour avertir le pilote qui suit qu’elle ralentit plus tôt.',
      'Les feux latéraux améliorent la visibilité dans les gerbes d’eau.',
    ],
    materials: 'LED, boîtier composite.',
    figures: [{ label: 'Feux', value: '1 central + 2 latéraux', note: 'dans le modèle' }],
    y2026: 'Le règlement 2026 ajoute des feux sur les plaques d’extrémité de l’aileron arrière.',
    caveat: 'Nous ne sommes pas certains du rôle exact de ces feux latéraux (visibilité ou signalisation de l’état du système hybride) : à vérifier dans le règlement.',
  },

  /* ---------------- Engine cover ---------------- */
  'ec.cover': {
    part: 'engineCover',
    name: 'Capot moteur',
    role: 'Carénage du groupe propulseur, effilé vers l’arrière.',
    how: [
      'Il couvre moteur, turbo, boîte de vitesses et radiateurs. Sa forme en « bouteille de Coca » accélère l’air vers l’arrière et l’aileron.',
      'Des ouïes et une sortie centrale évacuent l’air chaud.',
    ],
    materials: 'Carbone fin, fixations rapides.',
    figures: [{ label: 'Rétrécissement', value: 'coke bottle' }],
    y2026: 'Agencement du groupe propulseur revu (pas de MGU-H) et nouvelle architecture de refroidissement.',
  },
  'ec.airbox': {
    part: 'engineCover',
    name: 'Airbox et arceau',
    role: 'Prise d’air du moteur au-dessus de la tête du pilote, intégrée à l’arceau de sécurité.',
    how: [
      'L’entrée capte de l’air « dynamique » : à 300 km/h, la pression dynamique (environ 4,3 kPa) gonfle légèrement l’admission avant même le turbo.',
      'L’arceau, sous le carénage, protège le pilote en cas de retournement. Il est testé en charge.',
    ],
    materials: 'Structure carbone ou titane, carénage carbone.',
    figures: [{ label: 'Pression dynamique', value: '≈ 4,3 kPa', note: 'à 300 km/h' }],
    y2026: 'Principe inchangé ; charges d’homologation renforcées.',
  },
  'ec.fin': {
    part: 'engineCover',
    name: 'Aileron de requin',
    role: 'Lame verticale sur le capot, qui stabilise la voiture en lacet.',
    how: [
      'En dérapage, elle crée une force latérale qui aide l’aileron arrière à rester dans un écoulement plus régulier.',
      'C’est aussi un support visuel (numéro, sponsor).',
    ],
    materials: 'Carbone fin.',
    figures: [{ label: 'Taille', value: 'limitée', note: 'depuis 2018' }],
    y2026: 'Taille encadrée ; sa présence dépend des choix des équipes.',
    caveat: 'Représenté comme une option plausible, à valider.',
  },
  'ec.tcam': {
    part: 'engineCover',
    name: 'Caméra T',
    role: 'Caméra embarquée sur l’airbox, qui filme la piste devant le pilote.',
    how: [
      'Toutes les voitures portent la caméra, même quand elle est remplacée par un lest : la masse et l’aérodynamique sont ainsi les mêmes pour tous.',
      'Sa couleur distingue les deux voitures d’une équipe : noire pour l’une, jaune fluo pour l’autre.',
    ],
    materials: 'Boîtier composite, optique.',
    figures: [{ label: 'Code couleur', value: 'noir / jaune', note: 'première et seconde voiture' }],
    y2026: 'Inchangée.',
  },
  'ec.exhaust': {
    part: 'engineCover',
    name: 'Échappement',
    role: 'Sortie unique des gaz du moteur, au centre, sous l’aileron arrière.',
    how: [
      'Depuis 2014, une seule sortie centrale est autorisée, placée pour empêcher de « souffler » le diffuseur avec les gaz.',
      'Une ou deux sorties secondaires (wastegate) peuvent s’y ajouter.',
    ],
    materials: 'Inconel ou alliages réfractaires, revêtements thermiques.',
    figures: [{ label: 'Température', value: '≈ 900-1000 °C', note: 'gaz en sortie, ordre de grandeur' }],
    y2026: 'Sans MGU-H, les gaz font tourner seulement le turbo ; nouveaux carburants 100 % durables.',
  },
} satisfies Record<string, SubDef>

const ALL_SUBS: Record<string, SubDef> = { ...SUB_DEFS, ...SUB_DEFS_CHASSIS, ...SUB_DEFS_SUSPENSION, ...SUB_DEFS_AERO }

export const SUBS: Record<string, SubInfo> = Object.fromEntries(Object.entries(ALL_SUBS).map(([id, d]) => [id, { id, ...d }]))

/** Sub-components of each part, in display order. */
export const PART_SUBS: Record<PartId, string[]> = PART_ORDER.reduce(
  (acc, p) => {
    acc[p] = Object.keys(ALL_SUBS).filter((k) => ALL_SUBS[k].part === p)
    return acc
  },
  {} as Record<PartId, string[]>,
)
