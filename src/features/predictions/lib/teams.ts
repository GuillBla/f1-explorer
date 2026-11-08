/** Team colours by Jolpica constructorId (fallback grey). */
export const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27f4d2',
  ferrari: '#e8002d',
  red_bull: '#3671c6',
  mclaren: '#ff8000',
  aston_martin: '#229971',
  alpine: '#ff87bc',
  williams: '#64c4ff',
  rb: '#6692ff',
  haas: '#b6babd',
  audi: '#bb0a30',
  sauber: '#52e252',
  cadillac: '#c9a74a',
}
export const teamColor = (id: string) => TEAM_COLORS[id] ?? '#8b93a7'
