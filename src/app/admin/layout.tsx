import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { BrandMark } from '@/components/ui/BrandMark'
import { cerrarSesion } from '@/app/login/actions'

export const metadata: Metadata = {
  title: 'Panel',
  robots: { index: false, follow: false },
}

/*
  Segunda línea de defensa (la primera es el proxy, la última es RLS):
  este layout verifica la sesión contra Supabase en el servidor. Sin usuario,
  no se renderiza ni un byte del panel.
*/
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <>
      <header className="border-b border-line-soft bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="flex items-center gap-2">
              <BrandMark className="h-7 w-7" />
              <span className="font-display font-semibold text-pf-navy">Panel</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold text-ink-soft">
              <Link href="/admin" className="transition-colors hover:text-pf-blue">
                Propiedades
              </Link>
              <Link href="/" className="transition-colors hover:text-pf-blue">
                Ver la web
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-faint sm:block">{user.email}</span>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-pf-coral hover:text-pf-coral"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  )
}
