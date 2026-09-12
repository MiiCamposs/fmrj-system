# Deploy em produção — FMRJ (Vercel + Supabase)

Guia passo a passo para publicar a plataforma na internet. Você executa as
etapas que exigem login nas suas contas; o código já está pronto e testado.

Arquitetura em produção:
- **Vercel** hospeda o app Next.js (portal público + painel `/admin`).
- **Supabase** hospeda o banco Postgres + autenticação (login do admin).

---

## Etapa 1 — Criar o projeto Supabase de produção

1. Acesse <https://supabase.com> → **New project**.
2. Escolha organização, dê um nome (ex.: `fmrj-prod`), defina uma **senha do
   banco** (guarde-a) e a **região** (ex.: South America / São Paulo).
3. Aguarde o provisionamento (~2 min).
4. Vá em **Project Settings → API** e copie:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (em "Project API keys", revele) → será
     `SUPABASE_SERVICE_ROLE_KEY` (SECRETA — nunca exponha no navegador)

## Etapa 2 — Criar o schema (migrations + seed)

No painel Supabase → **SQL Editor** → **New query**, cole e rode **na ordem**
o conteúdo de cada arquivo (um de cada vez):

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions_triggers.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_admin_expansion.sql`
5. `supabase/migrations/0005_sports_core.sql`
6. `supabase/seed.sql`  (cria as 5 competições: Carioca A1, A2, B1, B2, C)

O seed cria **apenas as competições** — nenhum time, jogador ou resultado
fictício. Tudo o mais é cadastrado por você no painel.

> Alternativa com Supabase CLI: `supabase link --project-ref <REF>` e
> `supabase db push` (depois rode o `seed.sql` pelo SQL Editor).

## Etapa 3 — Criar o primeiro administrador

1. Supabase → **Authentication → Users → Add user** → informe e-mail e senha.
   Após criar, copie o **User UID** (UUID).
2. Supabase → **SQL Editor**, rode (troque o UUID e o e-mail):
   ```sql
   insert into admins (id, email, full_name, role)
   values ('COLE_O_UUID_AQUI', 'admin@fmrj.com', 'Administrador FMRJ', 'admin');
   ```

## Etapa 4 — Enviar o código para o GitHub

O deploy da Vercel puxa o código do GitHub. No terminal, dentro de
`fmrj-system`:

```bash
git remote add origin https://github.com/SEU_USUARIO/fmrj-system.git
git push -u origin master
```

(Crie o repositório vazio em <https://github.com/new> antes — pode ser privado.)

## Etapa 5 — Publicar na Vercel

1. Acesse <https://vercel.com> → **Add New… → Project** → **Import** o repositório
   `fmrj-system`.
2. Framework: **Next.js** (detectado automaticamente). Não mude build/output.
3. Em **Environment Variables**, adicione as 4 variáveis (valores da Etapa 1):

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role (secreta) |
   | `NEXT_PUBLIC_SITE_URL` | deixe temporário; atualiza na Etapa 6 |

4. **Deploy**. Ao final, a Vercel te dá uma URL pública, ex.:
   `https://fmrj-system.vercel.app`.

## Etapa 6 — Ajustar a URL pública (SEO/sitemap)

1. Copie a URL do deploy da Etapa 5.
2. Vercel → Project → **Settings → Environment Variables** → edite
   `NEXT_PUBLIC_SITE_URL` para essa URL (ex.: `https://fmrj-system.vercel.app`).
3. **Redeploy** (Deployments → menu ⋯ → Redeploy) para o valor valer no
   `robots.txt`/`sitemap.xml` e nas metatags Open Graph.

## Etapa 7 — Verificar em produção

- Portal público abre para qualquer pessoa: `/`, `/competicoes`, `/jogos`,
  `/times`, `/jogadores`, `/artilharia`, `/busca`.
- `https://SEU_SITE/robots.txt` e `https://SEU_SITE/sitemap.xml` respondem.
- `/admin` redireciona para `/login`; após logar com o admin da Etapa 3, o
  painel abre.
- Cadastre 1 competição/temporada/time/jogador de teste e confirme que o portal
  reflete os dados.

## Etapa 8 — Indexação no Google (opcional, recomendado)

1. <https://search.google.com/search-console> → adicionar propriedade com a URL
   do site (ou o domínio próprio, se já configurado).
2. Verifique a propriedade (via DNS ou meta tag).
3. Em **Sitemaps**, envie `https://SEU_SITE/sitemap.xml`.

## Etapa 9 — Conectar um domínio próprio da FMRJ (quando tiver)

1. Vercel → Project → **Settings → Domains → Add** → digite o domínio
   (ex.: `fmrj.com.br`).
2. A Vercel mostra os registros DNS a criar no seu provedor de domínio:
   - domínio apex (`fmrj.com.br`): registro **A** apontando para o IP indicado
     pela Vercel; **ou** `ALIAS/ANAME` para `cname.vercel-dns.com`.
   - subdomínio `www`: registro **CNAME** para `cname.vercel-dns.com`.
3. Aguarde a propagação e a Vercel emite o HTTPS automaticamente.
4. Atualize `NEXT_PUBLIC_SITE_URL` para o domínio final e faça **Redeploy**.
5. Supabase → **Authentication → URL Configuration**: defina o **Site URL** para
   o domínio final (e adicione-o em Redirect URLs), para o login funcionar sem
   avisos.

---

## Resumo das credenciais que só você tem

| Item | Onde obter | Usado em |
|------|-----------|----------|
| Conta Supabase + projeto | supabase.com | banco/auth |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` | Supabase → API | Vercel env |
| Conta GitHub + repositório | github.com | origem do deploy |
| Conta Vercel | vercel.com | hospedagem |
| Domínio próprio (opcional) | registrador (Registro.br, etc.) | domínio final |

Nada disso pode ser criado ou autenticado automaticamente — são suas contas.
