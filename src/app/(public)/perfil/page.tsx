import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getPlayerContext } from '@/lib/player-auth';
import { createClient } from '@/lib/supabase/server';
import { getPlayerRegistrations } from '@/lib/db/players';
import { Card } from '@/components/ui/ui';
import { ProfileForm } from './_components/profile-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Minha conta — UBM',
};

export default async function PerfilPage() {
  const ctx = await getPlayerContext();
  if (!ctx) redirect('/entrar?redirectTo=/perfil');

  const { account, player } = ctx;

  const supabase = await createClient();
  let registrations: Awaited<ReturnType<typeof getPlayerRegistrations>> = [];
  try {
    registrations = await getPlayerRegistrations(supabase, player.id);
  } catch {
    registrations = [];
  }

  return (
    <div>
      {/* Cabecalho do jogador */}
      <div className="mb-8 flex items-center gap-4">
        {player.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full border border-neutral-200 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-fmrj-dark text-xl font-black text-white">
            {(account.nick || '?').slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-black text-neutral-900">
            {account.nick}
          </h1>
          <p className="text-sm text-neutral-500">
            ID Mamoball: {account.mamoball_player_id}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Editar perfil
          </h2>
          <Card className="p-6">
            <ProfileForm
              initialNick={account.nick}
              initialAvatar={player.avatar_url ?? ''}
            />
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-neutral-800">
            Meus times e competições
          </h2>
          {registrations.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Você ainda não está inscrito em nenhum time. Assim que um capitão
              ou a organização te inscrever, aparece aqui.
            </p>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-100">
                {registrations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">
                        {r.teamName}
                      </p>
                      <p className="text-neutral-500">
                        {r.competitionName} · {r.seasonYear}
                      </p>
                    </div>
                    <Link
                      href={`/jogadores/${player.id}`}
                      className="text-xs font-medium text-fmrj hover:underline"
                    >
                      Ver
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <p className="mt-3 text-xs text-neutral-400">
            A sua conta serve para acessar o portal e manter o seu perfil. A
            inscrição em competições continua sendo feita pela organização.
          </p>
        </section>
      </div>
    </div>
  );
}
