-- OPCIONAL: crons precisos (e de hora em hora) pelo próprio Supabase, de graça.
-- Use se o projeto da Vercel estiver no plano Hobby, que só permite cron 1x por dia
-- e pode disparar em qualquer minuto dentro da hora marcada.
--
-- Antes de rodar:
--   1. Database → Extensions: ligue "pg_cron" e "pg_net".
--   2. Troque SEU-APP.vercel.app pelo endereço do app.
--   3. Troque COLE-O-CRON_SECRET pelo mesmo valor da variável CRON_SECRET da Vercel.
--      Ele fica guardado no Vault (cofre cifrado do Supabase), não no texto do cron.

select vault.create_secret('COLE-O-CRON_SECRET', 'jarvis_cron_secret');

create or replace function public.jarvis_chamar(caminho text) returns void
language sql security definer set search_path = public as $$
  select net.http_get(
    url := 'https://SEU-APP.vercel.app' || caminho,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'jarvis_cron_secret')
    ),
    timeout_milliseconds := 300000
  );
$$;
revoke all on function public.jarvis_chamar(text) from public, anon, authenticated;

-- Horários em UTC (Brasília = UTC-3)
select cron.schedule('jarvis-sync-hora-em-hora', '0 10-23,0-1 * * *', $$select public.jarvis_chamar('/api/cron/sync')$$); -- 7h às 22h
select cron.schedule('jarvis-sync-0845', '45 11 * * *', $$select public.jarvis_chamar('/api/cron/sync')$$);              -- 8h45
select cron.schedule('jarvis-bom-dia', '5 12 * * *', $$select public.jarvis_chamar('/api/cron/notify')$$);                -- 9h05
select cron.schedule('jarvis-bom-dia-2', '35 12 * * *', $$select public.jarvis_chamar('/api/cron/notify-retry')$$);       -- 9h35

-- Para conferir:   select * from cron.job_run_details order by start_time desc limit 20;
-- Para desfazer:   select cron.unschedule('jarvis-sync-hora-em-hora');  (e os demais)
