# FMRJ — Federação de MamoBall do Rio de Janeiro

Plataforma de gestão e consulta da FMRJ: painel administrativo autenticado +
portal público. Competições, temporadas, times, jogadores (identificados pelo
**MamoBall ID**), elencos, detecção de conflitos, partidas, eventos,
classificação e artilharia automáticas, estatísticas, histórico, busca e logs.

Stack: **Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS ·
Supabase (Postgres + Auth + RLS) · Vercel**. Testes com **Vitest**.

> Arquitetura e modelo de dados detalhados: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## Funcionalidades

**Administrativo (`/admin`, autenticado):**
- Dashboard com números reais (competições/temporadas ativas, times, jogadores,
  inscritos, conflitos pendentes, jogos próximos/encerrados, atividade recente).
- Competições (CRUD, status, pontuação e critérios de desempate configuráveis,
  regulamento), temporadas, times, jogadores, elencos.
- Cadastro de jogador por MamoBall ID com **detecção automática de conflito**.
- Partidas: criar/editar/resultado/status/excluir + eventos (gols,
  assistências, cartões). Classificação e artilharia atualizam automaticamente.
- Conflitos: lista, detalhe e resolução preservando histórico.
- Logs de auditoria das ações administrativas.

**Portal público (leitura):**
- Home, competições e página de cada competição com abas (visão geral,
  classificação, jogos, resultados, times, jogadores, artilharia, estatísticas,
  regulamento).
- Páginas de time e de jogador, artilharia com filtros, lista de jogos, página
  de cada partida com eventos, e **busca global** (jogador, nickname, MamoBall
  ID, time, competição).

## Regras de integridade (garantidas no banco + aplicação)

- `mamoball_player_id` é **único**: nunca dois jogadores com o mesmo ID.
- Nome/nickname **não** identificam o jogador (podem repetir/mudar).
- Mesmo ID em **duas equipes na mesma competição + temporada** → **conflito**
  automático (trigger). Competições/temporadas diferentes → apenas histórico.
- Inscrição idêntica (jogador+time+competição+temporada) não é duplicada
  (constraint `UNIQUE`).
- Remover jogador de um elenco é **remoção lógica** (status `removed`): o
  jogador global e todo o histórico são preservados.

---

## Pré-requisitos

- Node.js >= 20 (testado em 24)
- Conta [Supabase](https://supabase.com)
- Opcional (banco local): [Supabase CLI](https://supabase.com/docs/guides/cli)

## 1. Instalar

```bash
npm install
```

## 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar | Exposição |
|----------|----------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | pública (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | **SECRETA — só no servidor** |
| `NEXT_PUBLIC_SITE_URL` | URL do site (SEO/OG) | pública |

Nunca commite `.env.local`. Nunca prefixe a service role com `NEXT_PUBLIC_`.

## 3. Migrations e seed

Ordem em `supabase/migrations/`: `0001` → `0005`; seed em `supabase/seed.sql`
(cria as 5 competições iniciais: Carioca A1, A2, B1, B2, C — sem inventar times,
jogadores ou resultados).

**Com Supabase CLI (recomendado):**
```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push        # aplica as migrations
```
Local com Docker: `supabase start` e depois `supabase db reset` (migrations + seed).

**Sem CLI:** no SQL Editor do painel Supabase, execute na ordem o conteúdo de
`0001_schema.sql`, `0002_functions_triggers.sql`, `0003_rls.sql`,
`0004_admin_expansion.sql`, `0005_sports_core.sql` e por fim `seed.sql`.

## 4. Criar o primeiro administrador

O painel exige usuário em `auth.users` **e** na tabela `admins`.

1. Painel Supabase → Authentication → Users → **Add user** (email + senha).
   Copie o `id` (UUID).
2. No SQL Editor:
```sql
insert into admins (id, email, full_name, role)
values ('UUID_DO_USUARIO', 'admin@fmrj.com', 'Nome do Admin', 'admin');
```

## 5. Rodar em desenvolvimento

```bash
npm run dev
```
- Portal público: <http://localhost:3000>
- Login admin: <http://localhost:3000/login> → painel em `/admin`

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | desenvolvimento |
| `npm run build` | build de produção |
| `npm run start` | sobe o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | testes (Vitest) |
| `npm run test:watch` | testes em watch |

## Testes

Regras críticas cobertas por testes puros em `src/lib/domain/*.test.ts`:
detecção de conflito/duplicidade (identidade por MamoBall ID, troca de nickname,
competições diferentes), resolução de conflito e remoção preservando histórico,
classificação (pontos, V/E/D, GP/GC/SG, aproveitamento, isolamento de escopo,
pontuação customizada) e artilharia/estatísticas a partir dos eventos.

```bash
npm test
```

## Build e deploy (Vercel)

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente (`NEXT_PUBLIC_*` e
   `SUPABASE_SERVICE_ROLE_KEY`) em Project Settings → Environment Variables.
3. Deploy. As migrations continuam sendo aplicadas via Supabase (CLI ou SQL
   Editor), não pelo build da Vercel.

## Estrutura do projeto

```
src/
  app/
    (public)/            portal público (header próprio): home, competicoes,
                         jogos, times, jogadores, artilharia, busca
    admin/               painel administrativo (layout faz o gate de acesso)
    login/               autenticação
    layout.tsx           layout raiz + metadata/SEO
    error.tsx            boundary de erro global
    not-found.tsx        404
  components/            UI reutilizável (badge, tabela de classificação,
                         fixture de partida, toast, modal de confirmação)
  lib/
    domain/              regras PURAS + testes (conflitos, duplicidade,
                         classificação, estatísticas, pontuação, status)
    db/                  consultas tipadas ao Supabase
    actions/             utilitários de server actions
    supabase/            clients (browser/server/admin), middleware, tipos
    auth.ts, env.ts, format.ts
  types/                 tipos de domínio e do banco
supabase/
  migrations/            0001..0005 (aditivas, não-destrutivas)
  seed.sql               5 competições iniciais
```

## Segurança

- RLS habilitado em todas as tabelas: leitura pública apenas dos dados de
  competição; conflitos, auditoria e admins restritos a administradores.
- Escrita apenas por administradores (`is_admin()`), reforçada no backend
  (`requireAdmin()`) antes de qualquer operação com a service role.
- Visitantes públicos não conseguem alterar dados; `/admin` redireciona para
  login quando não autenticado.
