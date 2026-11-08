/**
 * Duels légendaires : texte éditorial ; les statistiques affichées (titres, victoires, départs en pole,
 * points de la saison décisive) sont calculées depuis champions.json.
 */
export interface Duel {
  id: string
  a: string // driverId Jolpica
  b: string
  /** Période de la rivalité (bornes incluses), pour compter les victoires de chacun. */
  from: number
  to: number
  /** Saison décisive dont on affiche les points finaux. */
  decisive: number
  title: string
  text: string
}

export const DUELS: Duel[] = [
  {
    id: 'hunt-lauda',
    a: 'hunt',
    b: 'lauda',
    from: 1976,
    to: 1976,
    decisive: 1976,
    title: 'Hunt – Lauda',
    text: "Le flamboyant Britannique contre le méthodique Autrichien. Grièvement brûlé au Nürburgring, Lauda revient six semaines plus tard ; sous le déluge de Fuji, il renonce et Hunt l’emporte pour un point.",
  },
  {
    id: 'senna-prost',
    a: 'senna',
    b: 'prost',
    from: 1988,
    to: 1993,
    decisive: 1989,
    title: 'Senna – Prost',
    text: "Équipiers chez McLaren en 1988-1989, ennemis jurés ensuite. Deux titres se jouent sur des accrochages à Suzuka (1989 pour Prost, 1990 pour Senna). La plus célèbre rivalité de l’histoire du sport automobile.",
  },
  {
    id: 'hakkinen-schumacher',
    a: 'hakkinen',
    b: 'michael_schumacher',
    from: 1998,
    to: 2001,
    decisive: 1998,
    title: 'Häkkinen – Schumacher',
    text: "Le rival que Schumacher disait respecter le plus. McLaren-Mercedes contre Ferrari, avec en point d’orgue le dépassement de Häkkinen à Spa en 2000.",
  },
  {
    id: 'vettel-alonso',
    a: 'vettel',
    b: 'alonso',
    from: 2010,
    to: 2013,
    decisive: 2012,
    title: 'Vettel – Alonso',
    text: "Red Bull contre Ferrari : Alonso arrive en tête à la finale 2010 et reste en lice jusqu’à la dernière course en 2012. Les deux fois, Vettel l’emporte, en route vers quatre titres consécutifs.",
  },
  {
    id: 'hamilton-rosberg',
    a: 'hamilton',
    b: 'rosberg',
    from: 2014,
    to: 2016,
    decisive: 2016,
    title: 'Hamilton – Rosberg',
    text: "Amis d’enfance devenus rivaux au sein de l’écurie dominante. Hamilton gagne en 2014 et 2015, Rosberg s’impose en 2016 puis prend sa retraite.",
  },
  {
    id: 'hamilton-verstappen',
    a: 'hamilton',
    b: 'max_verstappen',
    from: 2021,
    to: 2021,
    decisive: 2021,
    title: 'Hamilton – Verstappen',
    text: "Une saison d’accrochages (Silverstone, Monza) et de coups d’éclat, conclue à égalité de points avant la finale d’Abu Dhabi, remportée par Verstappen dans le dernier tour.",
  },
]
