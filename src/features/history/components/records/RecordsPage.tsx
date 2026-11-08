import { useMemo } from 'react'
import { Card, ErrorState, Loader, Page, PageHeader } from '@/components/ui'
import { useChampions } from '../../hooks/useChampions'
import {
  championsByAge,
  completed,
  countByDriver,
  countByTeam,
  distinctWinners,
  driverTitles,
  winStreaks,
  winnersByAge,
  winsInSeason,
  type Tally,
} from '../../lib/stats'
import { formatAge, formatAgeShort, raceNameFr } from '../../lib/format'
import { StatTile } from '../StatTile'
import { DuelCard } from './DuelCard'
import { DUELS } from '../../data/duels'

export default function RecordsPage() {
  const { data, isLoading, error, refetch } = useChampions()

  const s = useMemo(() => {
    if (!data) return null
    return {
      titles: driverTitles(data),
      wins: countByDriver(data, data.winners),
      poles: countByDriver(data, data.poles),
      teamWins: countByTeam(data.winners),
      young: winnersByAge(data, 'young'),
      old: winnersByAge(data, 'old'),
      youngChamps: championsByAge(data).sort((a, b) => a.age.totalDays - b.age.totalDays),
      season: winsInSeason(data),
      streaks: winStreaks(data),
      distinct: distinctWinners(data),
      seasons: completed(data).length,
    }
  }, [data])

  if (isLoading) return <Page><Loader /></Page>
  if (error || !data || !s) return <Page><ErrorState error={error ?? 'Données indisponibles'} onRetry={() => refetch()} /></Page>

  const lastRace = data.winners[data.winners.length - 1]
  const topTitles = s.titles.filter((t) => t.value === s.titles[0].value)

  return (
    <Page>
      <PageHeader
        title="Records et statistiques"
        subtitle={`Calculés à partir des ${data.winners.length} Grands Prix enregistrés dans Jolpica (jusqu’au ${raceNameFr(lastRace.race)} ${lastRace.y}). Les 500 miles d’Indianapolis (1950-1960), qui comptaient pour le championnat, sont inclus dans les victoires.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Plus de titres" value={s.titles[0].value} hint={topTitles.map((t) => t.label).join(' et ')} accent="var(--color-warn)" />
        <StatTile label="Plus de victoires" value={s.wins[0].value} hint={s.wins[0].label} accent="var(--color-f1)" />
        <StatTile label="Plus de départs en pole" value={s.poles[0].value} hint={s.poles[0].label} accent="var(--color-accent)" />
        <StatTile label="Vainqueurs différents" value={s.distinct} hint={`en ${s.seasons} saisons complètes`} />
        <StatTile
          label="Plus jeune vainqueur"
          value={formatAge(s.young[0].age)}
          hint={`${s.young[0].name} · ${raceNameFr(s.young[0].race)} ${s.young[0].year}`}
        />
        <StatTile
          label="Vainqueur le plus âgé"
          value={formatAge(s.old[0].age)}
          hint={`${s.old[0].name} · ${raceNameFr(s.old[0].race)} ${s.old[0].year}. Victoires partagées exclues : Luigi Fagioli avait 53 ans au GP de France 1951, gagné en relais avec Fangio.`}
        />
        <StatTile label="Victoires en une saison" value={s.season[0].value} hint={`${s.season[0].label} (${s.season[0].years?.[0]})`} />
        <StatTile
          label="Victoires consécutives"
          value={s.streaks[0].length}
          hint={`${s.streaks[0].name} · ${s.streaks[0].from} → ${s.streaks[0].to}`}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Leaderboard title="Victoires" rows={s.wins} />
        <Leaderboard title="Départs en pole" rows={s.poles} note="Pilote parti en 1re position sur la grille : peut différer légèrement du décompte officiel des poles (pénalités, grilles inversées)." />
        <Leaderboard title="Victoires par écurie" rows={s.teamWins} note="Regroupées par marque (Lotus-Climax, Team Lotus… → Lotus)." />
        <Card title="Plus jeunes champions">
          <ol className="space-y-1 text-sm">
            {s.youngChamps.slice(0, 10).map((c, i) => (
              <li key={c.year} className="flex items-baseline gap-2">
                <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
                <span className="flex-1 truncate font-semibold">{c.name}</span>
                <span className="font-mono text-xs text-muted">{c.year}</span>
                <span className="whitespace-nowrap text-right font-mono text-xs">{formatAgeShort(c.age)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">Âge à la date de la dernière course de la saison (le titre a pu être acquis plus tôt).</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Plus jeunes vainqueurs (1re victoire)">
          <AgeList rows={s.young.slice(0, 10)} />
        </Card>
        <Card title="Saisons les plus prolifiques">
          <ol className="space-y-1 text-sm">
            {s.season.slice(0, 10).map((t, i) => (
              <li key={t.key} className="flex items-baseline gap-2">
                <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
                <span className="flex-1 truncate font-semibold">{t.label}</span>
                <span className="font-mono text-xs text-muted">{t.years?.[0]}</span>
                <span className="whitespace-nowrap text-right font-mono">{t.value} vict.</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* ——— Duels légendaires */}
      <section className="mt-14">
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight md:text-4xl">
          <span className="inline-block h-7 w-1.5 -skew-x-12 bg-f1" />
          Duels légendaires
        </h2>
        <p className="mt-2 max-w-3xl text-muted">
          Récits éditoriaux, statistiques de carrière calculées depuis les données Jolpica.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {DUELS.map((d, i) => (
            <DuelCard key={d.id} duel={d} data={data} index={i} />
          ))}
        </div>
      </section>
    </Page>
  )
}

function Leaderboard({ title, rows, note }: { title: string; rows: Tally[]; note?: string }) {
  const max = rows[0]?.value ?? 1
  return (
    <Card title={title}>
      <ol className="space-y-1.5 text-sm">
        {rows.slice(0, 10).map((r, i) => (
          <li key={r.key}>
            <div className="flex items-baseline gap-2">
              <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
              <span className="flex-1 truncate font-semibold">{r.label}</span>
              <span className="font-mono">{r.value}</span>
            </div>
            <div className="ml-7 mt-0.5 h-1 rounded-full bg-surface-2">
              <div className="h-1 rounded-full bg-f1/80" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </Card>
  )
}

function AgeList({ rows }: { rows: ReturnType<typeof winnersByAge> }) {
  return (
    <ol className="space-y-1 text-sm">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-baseline gap-2">
          <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
          <span className="flex-1 truncate">
            <span className="font-semibold">{r.name}</span>
            <span className="ml-1 text-xs text-muted">
              {raceNameFr(r.race)} {r.year}
            </span>
          </span>
          <span className="whitespace-nowrap text-right font-mono text-xs">{formatAgeShort(r.age)}</span>
        </li>
      ))}
    </ol>
  )
}
