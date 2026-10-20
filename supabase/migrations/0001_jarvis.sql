-- Jarvis Fênix: tabelas acessadas SÓ pelo servidor (service role).
-- RLS ligado e nenhuma política: a chave pública (anon) não lê nem grava nada.

create table if not exists public.contas_email (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('gmail', 'outlook', 'outro')),
  email text not null unique,
  apelido text not null,
  servidor text not null,
  porta integer not null check (porta between 1 and 65535),
  conta_boleto text not null check (conta_boleto in ('PF', 'PJ')),
  -- AES-256-GCM com EMAIL_ENC_KEY (só a Vercel tem a chave)
  senha_cifrada text not null,
  pausada boolean not null default false,
  ultima_sync timestamptz,
  boletos_achados integer not null default 0,
  erro text,
  pendente boolean not null default false,
  -- Cursor IMAP, Message-IDs já vistos e boletos futuros (só campos do boleto, nunca o e-mail)
  estado jsonb not null default '{}'::jsonb,
  travada_ate timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.boletos_pagos (
  chave text primary key,
  marcado_por text,
  criado_em timestamptz not null default now()
);

create table if not exists public.push_inscricoes (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  email text,
  aparelho text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.jarvis_estado (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);

alter table public.contas_email enable row level security;
alter table public.boletos_pagos enable row level security;
alter table public.push_inscricoes enable row level security;
alter table public.jarvis_estado enable row level security;

revoke all on public.contas_email, public.boletos_pagos, public.push_inscricoes, public.jarvis_estado from anon, authenticated;
