import { Link } from 'react-router-dom'
import { NAV } from './nav'

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl md:text-6xl font-black tracking-tight">
        Tout l'univers de la <span className="text-f1">Formule 1</span>
      </h1>
      <p className="mt-4 text-muted max-w-2xl text-lg">
        Course en temps réel, technique, prédictions, circuits et histoire : un seul endroit pour tout explorer.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAV.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border border-border bg-surface p-6 hover:border-f1 hover:bg-surface-2 transition-colors"
          >
            <Icon className="text-f1" />
            <h2 className="mt-3 text-xl font-bold group-hover:text-f1">{label}</h2>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
