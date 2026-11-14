import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { NAV } from './nav'

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-f1">Formule 1 · 1950 → aujourd'hui</p>
      <h1 className="mt-3 font-wide text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] text-balance max-w-4xl">
        Tout l'univers de la <span className="text-f1">Formule 1</span>
      </h1>
      <p className="mt-5 text-muted max-w-2xl text-lg">
        Course en temps réel, technique, prédictions, circuits et histoire : un seul endroit pour tout explorer.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/live" className="inline-flex items-center gap-2 rounded-full bg-f1 px-5 py-2.5 font-bold text-on-f1 hover:brightness-110">
          Suivre la course <ArrowRight size={16} />
        </Link>
        <Link to="/tech" className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border px-5 py-2.5 font-bold hover:border-text">
          Explorer la voiture
        </Link>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAV.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="group relative overflow-hidden rounded border border-border bg-surface p-6 transition-colors hover:border-f1"
          >
            <Icon className="text-f1" />
            <h2 className="mt-3 font-wide text-xl font-extrabold group-hover:text-f1">{label}</h2>
            <p className="mt-1 text-sm text-muted">{desc}</p>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-f1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  )
}
