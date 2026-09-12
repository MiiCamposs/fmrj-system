# Arquitetura — Sistema FMRJ

Federacao de MamoBall do Rio de Janeiro. Documento curto de referencia
tecnica. Complementa o `README.md` (que cobre execucao e ambiente).

## 1. Visao geral

Aplicacao web full-stack para gerir competicoes, temporadas, times, jogadores
e inscricoes da FMRJ, com **portal publico somente leitura** e **painel
administrativo autenticado**.

```
┌────────────────────┐     ┌──────────────────────────┐
│  Portal publico    │     │  Painel administrativo   │
│  (somente leitura) │     │  (auth obrigatoria)      │
└─────────┬──────────┘     └───────────┬──────────────┘
          │  anon key (RLS)            │  sessao admin (RLS) / service role
          └──────────────┬─────────────┘
                         ▼
              ┌─────────────────────┐
              │  Supabase Postgres  │
              │  RLS + triggers     │  ← regras criticas garantidas aqui
              └─────────────────────┘
```

## 2. Stack e por que

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Framework | Next.js 15 (App Router) | SSR para portal leve; Server Actions para o admin; deploy Vercel |
| Linguagem | TypeScript (strict) | seguranca de tipos ponta a ponta |
| UI | React 19 + Tailwind CSS 3.4 | produtivo, estavel, sem runtime pesado |
| Dados/Auth | Supabase (Postgres + Auth + RLS) | regras no banco, nao so no front |
| Testes | Vitest | rapido; testa a logica pura de conflito sem banco |

Nenhuma troca em relacao a stack pedida. A unica decisao de versao relevante:
Next fixado em **15.5.25** (versao com correcao de CVE) e `@supabase/ssr`
alinhado ao `@supabase/supabase-js` (^0.12 / ^2.116) para evitar conflito de
tipos entre as duas libs.

## 3. Modelo de dados

```
competitions 1───* seasons
     │                 │
     │                 │
teams          registrations *───1 players (mamoball_player_id UNIQUE)
     └──────* registrations *──────┘
                   │
                   * (quando conflito)
              conflicts 1───* conflict_registrations
```

Entidades:

- **admins** — 1:1 com `auth.users`; quem acessa o painel.
- **competitions** — competicao independente (Carioca A1, A2, ...). `slug` unico.
- **seasons** — temporada/edicao de uma competicao. `UNIQUE (competition_id, year)`.
- **teams** — clube unico, reutilizado entre competicoes (`slug` unico). Nao se
  duplica so por participar de outra competicao.
- **players** — jogador. `mamoball_player_id` **UNIQUE** e o unico identificador
  de identidade. Nome e nickname podem mudar e nao sao unicos.
- **registrations** — inscricao: vinculo Player → Team → Competition → Season.
  Preserva historico (nunca guardamos `team_id` direto no player).
- **conflicts** / **conflict_registrations** — registro de conflito de inscricao
  e as inscricoes/times envolvidos. Nunca apagados ao resolver.
- **audit_logs** — trilha de auditoria de acoes administrativas.

## 4. A regra critica (conflito de inscricao)

> mesmo `mamoball_player_id` + mesma competition + mesma season + times
> diferentes = **CONFLITO**.

Garantida em **tres camadas** (defesa em profundidade):

1. **Constraint** `UNIQUE (player_id, team_id, competition_id, season_id)` —
   impede a inscricao exatamente duplicada (mesmo time). Banco nunca aceita.
2. **Trigger** `fn_detect_registration_conflict` (AFTER INSERT) — quando o
   jogador aparece em >1 time no mesmo escopo, cria/atualiza um conflito
   `pending` e vincula as inscricoes. Nao bloqueia; sinaliza para o admin.
3. **Funcao pura** `evaluateRegistration` (`src/lib/domain/conflicts.ts`) —
   mesma regra em TypeScript, para feedback imediato na interface e como base
   dos testes automatizados.

Competicoes ou temporadas **diferentes nunca entram no mesmo escopo** — viram
historico, nao conflito.

Duplicidade por **nome/nickname** (`src/lib/domain/duplicates.ts`) gera apenas
**alerta**; nunca prova de identidade. So o `mamoball_player_id` identifica.

## 5. Seguranca (RLS)

- RLS habilitado em todas as tabelas.
- **Leitura publica** apenas de: competitions, seasons, teams, players,
  registrations.
- **Escrita** em qualquer tabela: somente `is_admin()` (usuario autenticado
  presente em `admins`).
- **conflicts, conflict_registrations, audit_logs, admins**: acesso restrito a
  administradores (sem leitura publica).
- A `service_role` key (ignora RLS) e usada **apenas no servidor**, sempre apos
  `requireAdmin()`. Nunca vai ao browser.

## 6. Estrutura de pastas

```
src/
  app/                      rotas (App Router)
    page.tsx                home publica (lista competicoes)
    competicoes/[slug]/     detalhe publico de competicao
    login/                  autenticacao admin
    admin/                  painel protegido (layout faz o gate)
  lib/
    domain/                 regras puras (conflito, duplicidade, slug) + testes
    db/                     consultas tipadas (players, competitions, audit)
    supabase/               clients (browser/server/admin), middleware, tipos
    auth.ts                 getAdminContext / requireAdmin
    env.ts                  leitura validada de variaveis de ambiente
  types/                    tipos de dominio e do banco
supabase/
  migrations/               0001 schema, 0002 funcoes/triggers, 0003 RLS
  seed.sql                  as 5 competicoes iniciais
```

## 7. Preparado para expandir (sem reconstruir)

O modelo suporta, no futuro, sem mudanca estrutural: novas competicoes (Copa
FMRJ, Supercopa, base), novas divisoes, novas temporadas, transferencias
(historico ja existe via registrations), suspensoes/cartoes/estatisticas
(tabelas novas referenciando registrations), noticias, MVP, ranking e
integracao com Discord. Nada na fundacao impede essas adicoes.
