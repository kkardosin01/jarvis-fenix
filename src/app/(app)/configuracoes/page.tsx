'use client'

import { ArrowLeft, Bell, KeyRound, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { tempoDesde } from 'jarvis-fenix-core/ptbr'
import type { TipoContaEmail } from 'jarvis-fenix-core/types'
import { sair } from '@/app/acoes'
import { InstrucoesGmail, InstrucoesOutlook } from '@/components/instrucoes-senha'
import { desligarPush, ligarPush, situacaoPush, type SituacaoPush } from '@/components/notificacoes'
import { limparDadosLocais, usePainel } from '@/components/provedor'
import { Botao, Campo, Cartao, Chips, Esqueleto, Etiqueta, Modal, Vazio, classeEntrada } from '@/components/ui'
import type { ContaEmailWeb } from '@/lib/tipos'

const PROVEDORES: Record<Exclude<TipoContaEmail, 'outro'>, { servidor: string; porta: number }> = {
  gmail: { servidor: 'imap.gmail.com', porta: 993 },
  outlook: { servidor: 'outlook.office365.com', porta: 993 }
}

function FormConta({ aoSalvar, aoFechar }: { aoSalvar: () => void; aoFechar: () => void }) {
  const { api } = usePainel()
  const [tipo, setTipo] = useState<TipoContaEmail>('gmail')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [servidor, setServidor] = useState(PROVEDORES.gmail.servidor)
  const [porta, setPorta] = useState(993)
  const [apelido, setApelido] = useState('')
  const [contaBoleto, setContaBoleto] = useState<'PF' | 'PJ'>('PF')
  const [teste, setTeste] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState<'testando' | 'salvando' | null>(null)

  const mudarTipo = (t: TipoContaEmail): void => {
    setTipo(t)
    setTeste(null)
    if (t !== 'outro') {
      setServidor(PROVEDORES[t].servidor)
      setPorta(PROVEDORES[t].porta)
    }
  }
  const conexao = { tipo, email: email.trim(), senha: senha.replace(/\s+/g, tipo === 'gmail' ? '' : ' ').trim(), servidor: servidor.trim(), porta }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setOcupado('salvando')
        try {
          await api('/api/contas-email', { method: 'POST', body: JSON.stringify({ ...conexao, apelido: apelido.trim(), contaBoleto }) })
          aoSalvar()
        } catch (err) {
          setTeste({ ok: false, texto: (err as Error).message })
        } finally {
          setOcupado(null)
        }
      }}
    >
      <Chips
        rotulo="Tipo de conta"
        valor={tipo}
        aoMudar={mudarTipo}
        opcoes={[
          { valor: 'gmail', rotulo: 'Gmail' },
          { valor: 'outlook', rotulo: 'Outlook' },
          { valor: 'outro', rotulo: 'Outro' }
        ]}
      />
      <Campo rotulo="E-mail">
        <input type="email" required autoComplete="off" value={email} onChange={(e) => (setEmail(e.target.value), setTeste(null))} className={classeEntrada} placeholder="nome@gmail.com" />
      </Campo>
      <Campo rotulo="Senha de app" dica="Não é a senha normal do e-mail. Veja como gerar logo abaixo.">
        <input type="password" required autoComplete="new-password" value={senha} onChange={(e) => (setSenha(e.target.value), setTeste(null))} className={classeEntrada} />
      </Campo>
      {tipo === 'outro' && (
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Campo rotulo="Servidor IMAP">
            <input required value={servidor} onChange={(e) => setServidor(e.target.value)} className={classeEntrada} placeholder="imap.exemplo.com" />
          </Campo>
          <Campo rotulo="Porta">
            <input required inputMode="numeric" value={porta} onChange={(e) => setPorta(Number(e.target.value.replace(/\D/g, '')) || 0)} className={classeEntrada} />
          </Campo>
        </div>
      )}
      <Campo rotulo="Apelido" dica='Aparece na tela Contas, ex.: "Pessoal do Tulio".'>
        <input required maxLength={40} value={apelido} onChange={(e) => setApelido(e.target.value)} className={classeEntrada} />
      </Campo>
      <fieldset>
        <legend className="mb-1.5 text-base font-semibold">Os boletos desta conta são</legend>
        <Chips
          rotulo="PF ou PJ"
          valor={contaBoleto}
          aoMudar={setContaBoleto}
          opcoes={[
            { valor: 'PF', rotulo: 'PF (pessoais)' },
            { valor: 'PJ', rotulo: 'PJ (empresa)' }
          ]}
        />
      </fieldset>

      {teste && (
        <p role="status" className={teste.ok ? 'text-base font-semibold text-ok' : 'text-base font-semibold text-perigo'}>
          {teste.texto}
        </p>
      )}
      <Botao
        type="button"
        disabled={!!ocupado || !email || !senha}
        onClick={async () => {
          setOcupado('testando')
          try {
            const r = await api<{ ok: boolean; erro?: string }>('/api/contas-email/testar', { method: 'POST', body: JSON.stringify(conexao) })
            setTeste(r.ok ? { ok: true, texto: 'Conexão funcionando! Agora é só salvar.' } : { ok: false, texto: r.erro ?? 'Não conectou.' })
          } catch (err) {
            setTeste({ ok: false, texto: (err as Error).message })
          } finally {
            setOcupado(null)
          }
        }}
      >
        {ocupado === 'testando' ? 'Testando…' : 'Testar conexão'}
      </Botao>
      <div className="grid grid-cols-2 gap-3">
        <Botao type="button" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primaria" disabled={!teste?.ok || !!ocupado || !apelido.trim()}>
          {ocupado === 'salvando' ? 'Salvando…' : 'Salvar conta'}
        </Botao>
      </div>

      {tipo !== 'outro' && (
        <details className="rounded-2xl border border-borda p-4">
          <summary className="min-h-11 cursor-pointer text-lg font-semibold">Como gerar a senha de app do {tipo === 'gmail' ? 'Gmail' : 'Outlook'}</summary>
          <div className="mt-3">{tipo === 'gmail' ? <InstrucoesGmail /> : <InstrucoesOutlook />}</div>
        </details>
      )}
    </form>
  )
}

function TrocarSenha({ conta, aoFechar, aoSalvar }: { conta: ContaEmailWeb; aoFechar: () => void; aoSalvar: () => void }) {
  const { api } = usePainel()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setOcupado(true)
        setErro(null)
        try {
          await api(`/api/contas-email/${conta.id}`, { method: 'PATCH', body: JSON.stringify({ senha: senha.replace(/\s+/g, conta.tipo === 'gmail' ? '' : ' ').trim() }) })
          aoSalvar()
        } catch (err) {
          setErro((err as Error).message)
        } finally {
          setOcupado(false)
        }
      }}
    >
      <p className="text-base text-suave">{conta.email}</p>
      <Campo rotulo="Nova senha de app" dica="Testamos a conexão antes de salvar.">
        <input type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={classeEntrada} />
      </Campo>
      {erro && <p className="text-base font-semibold text-perigo">{erro}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Botao type="button" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primaria" disabled={ocupado || senha.length < 4}>
          {ocupado ? 'Testando…' : 'Salvar'}
        </Botao>
      </div>
    </form>
  )
}

function ItemConta({ c, recarregar }: { c: ContaEmailWeb; recarregar: () => void }) {
  const { api, atualizar } = usePainel()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [trocando, setTrocando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  const acao = async (nome: string, fn: () => Promise<string | void>): Promise<void> => {
    setOcupado(nome)
    setAviso(null)
    try {
      const msg = await fn()
      if (msg) setAviso(msg)
      recarregar()
    } catch (e) {
      setAviso((e as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <li className="rounded-2xl border border-borda bg-superficie p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold">{c.apelido}</p>
          <p className="text-base break-all text-suave">{c.email}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Etiqueta tom="primaria">{c.contaBoleto}</Etiqueta>
          {c.pausada && <Etiqueta>Pausada</Etiqueta>}
        </div>
      </div>
      <p className="mt-2 text-base">
        Senha: <span className="tracking-widest">••••</span> · Última sincronização: <b>{tempoDesde(c.ultimaSincronizacao)}</b> · {c.boletosAchados}{' '}
        {c.boletosAchados === 1 ? 'boleto achado' : 'boletos achados'}
      </p>
      {c.pendente && !c.erro && <p className="text-sm text-suave">Ainda lendo e-mails antigos; continua na próxima sincronização.</p>}
      {c.erro && <p className="mt-2 rounded-xl bg-perigo-suave p-3 text-base font-semibold text-perigo">{c.erro}</p>}
      {aviso && <p className="mt-2 text-base font-semibold">{aviso}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao
          disabled={!!ocupado || c.pausada}
          onClick={() =>
            acao('sync', async () => {
              const r = await api<{ resultado: { novos: number; erro: string | null } }>(`/api/contas-email/${c.id}/sincronizar`, { method: 'POST' })
              if (r.resultado.novos > 0) await atualizar()
              return r.resultado.erro ?? (r.resultado.novos ? `${r.resultado.novos} boleto(s) novo(s)!` : 'Nenhum boleto novo.')
            })
          }
        >
          <RefreshCw size={20} aria-hidden className={ocupado === 'sync' ? 'animate-spin' : ''} />
          {ocupado === 'sync' ? 'Lendo…' : 'Sincronizar agora'}
        </Botao>
        <Botao disabled={!!ocupado} onClick={() => acao('pausa', () => api(`/api/contas-email/${c.id}`, { method: 'PATCH', body: JSON.stringify({ pausada: !c.pausada }) }).then(() => undefined))}>
          {c.pausada ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
          {c.pausada ? 'Retomar' : 'Pausar'}
        </Botao>
        <Botao disabled={!!ocupado} onClick={() => setTrocando(true)}>
          <KeyRound size={20} aria-hidden /> Trocar senha
        </Botao>
        <Botao variante="perigo" disabled={!!ocupado} onClick={() => setRemovendo(true)}>
          <Trash2 size={20} aria-hidden /> Remover
        </Botao>
      </div>

      <Modal aberto={trocando} aoFechar={() => setTrocando(false)} titulo="Trocar senha de app">
        {trocando && (
          <TrocarSenha
            conta={c}
            aoFechar={() => setTrocando(false)}
            aoSalvar={() => {
              setTrocando(false)
              recarregar()
            }}
          />
        )}
      </Modal>
      <Modal aberto={removendo} aoFechar={() => setRemovendo(false)} titulo="Remover esta conta?">
        <p className="text-lg">
          O Jarvis para de ler <b>{c.email}</b> e apaga a senha guardada. Os boletos que já estão na planilha continuam lá.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Botao onClick={() => setRemovendo(false)}>Cancelar</Botao>
          <Botao
            variante="perigo"
            onClick={() =>
              acao('remover', async () => {
                await api(`/api/contas-email/${c.id}`, { method: 'DELETE' })
                setRemovendo(false)
              })
            }
          >
            Remover
          </Botao>
        </div>
      </Modal>
    </li>
  )
}

function SecaoContas() {
  const { api } = usePainel()
  const [contas, setContas] = useState<ContaEmailWeb[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)

  const carregar = useCallback(() => {
    api<{ contas: ContaEmailWeb[] }>('/api/contas-email')
      .then((r) => {
        setContas(r.contas)
        setErro(null)
      })
      .catch((e: Error) => setErro(e.message))
  }, [api])
  useEffect(carregar, [carregar])

  return (
    <Cartao>
      <h2 className="text-xl font-bold">Contas de e-mail pessoais</h2>
      <p className="mt-1 mb-3 text-base text-suave">
        O Jarvis só <b>lê</b> estes e-mails para achar boletos: nunca envia, apaga ou marca como lido. O e-mail da empresa já é lido pelo resumo da nuvem.
      </p>
      {erro && <p className="mb-3 text-base font-semibold text-perigo">{erro}</p>}
      {!contas && !erro ? (
        <Esqueleto linhas={1} altura="h-36" />
      ) : contas && contas.length === 0 ? (
        <Vazio>Nenhuma conta pessoal conectada.</Vazio>
      ) : (
        <ul className="flex flex-col gap-3">
          {contas?.map((c) => (
            <ItemConta key={c.id} c={c} recarregar={carregar} />
          ))}
        </ul>
      )}
      <Botao variante="primaria" className="mt-3 w-full" onClick={() => setAdicionando(true)}>
        <Plus size={20} aria-hidden /> Adicionar conta
      </Botao>
      <Modal aberto={adicionando} aoFechar={() => setAdicionando(false)} titulo="Adicionar conta de e-mail">
        {adicionando && (
          <FormConta
            aoFechar={() => setAdicionando(false)}
            aoSalvar={() => {
              setAdicionando(false)
              carregar()
            }}
          />
        )}
      </Modal>
    </Cartao>
  )
}

function SecaoNotificacoes() {
  const { chaveVapid, api } = usePainel()
  const [s, setS] = useState<SituacaoPush>('carregando')
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    situacaoPush()
      .then(setS)
      .catch(() => setS('sem-suporte'))
  }, [])

  const texto: Record<SituacaoPush, string> = {
    carregando: '…',
    'sem-suporte': 'Este navegador não recebe notificações.',
    'precisa-instalar': 'No iPhone, primeiro adicione o Jarvis à Tela de Início (Safari → Compartilhar → Adicionar à Tela de Início) e abra por lá.',
    bloqueada: 'Bloqueadas nas configurações do aparelho. Libere em Ajustes → Notificações.',
    desligada: 'Desligadas neste aparelho.',
    ligada: 'Ligadas neste aparelho: resumo às 9h e aviso de boleto novo (nunca entre 22h e 7h).'
  }

  return (
    <Cartao>
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Bell size={22} aria-hidden /> Notificações
      </h2>
      <p className="mt-1 text-base">{texto[s]}</p>
      {msg && <p className="mt-2 text-base font-semibold">{msg}</p>}
      {(s === 'desligada' || s === 'ligada') && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Botao
            variante={s === 'ligada' ? 'secundaria' : 'primaria'}
            onClick={async () => {
              setMsg(null)
              try {
                if (s === 'ligada') await desligarPush()
                else await ligarPush(chaveVapid)
              } catch (e) {
                setMsg((e as Error).message)
              }
              setS(await situacaoPush())
            }}
          >
            {s === 'ligada' ? 'Desativar' : 'Ativar'}
          </Botao>
          {s === 'ligada' && (
            <Botao
              onClick={async () => {
                try {
                  await api('/api/push/teste', { method: 'POST' })
                  setMsg('Enviada! Deve chegar em alguns segundos.')
                } catch (e) {
                  setMsg((e as Error).message)
                }
              }}
            >
              Testar
            </Botao>
          )}
        </div>
      )}
    </Cartao>
  )
}

type Fonte = 'normal' | 'grande' | 'muito-grande'

function lerFonte(): Fonte {
  const f = document.documentElement.dataset.fonte
  return f === 'grande' || f === 'muito-grande' ? f : 'normal'
}

function observarFonte(aviso: () => void): () => void {
  const o = new MutationObserver(aviso)
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-fonte'] })
  return () => o.disconnect()
}

function SecaoFonte() {
  // O script do <head> já aplicou o tamanho salvo em <html data-fonte>
  const fonte = useSyncExternalStore(observarFonte, lerFonte, () => 'normal' as Fonte)
  const mudar = (f: Fonte): void => {
    document.documentElement.dataset.fonte = f
    try {
      localStorage.setItem('jarvis:fonte', f)
    } catch {
      /* segue só nesta sessão */
    }
  }
  return (
    <Cartao>
      <h2 className="mb-3 text-xl font-bold">Tamanho da letra</h2>
      <Chips
        rotulo="Tamanho da letra"
        valor={fonte}
        aoMudar={mudar}
        opcoes={[
          { valor: 'normal', rotulo: 'Normal' },
          { valor: 'grande', rotulo: 'Grande' },
          { valor: 'muito-grande', rotulo: 'Muito grande' }
        ]}
      />
    </Cartao>
  )
}

export default function Configuracoes() {
  const { email } = usePainel()
  return (
    <>
      <header className="pt-seguro sticky top-0 z-20 flex min-h-16 items-center gap-2 border-b border-borda bg-fundo/95 px-2 py-2 backdrop-blur">
        <Link href="/" aria-label="Voltar para Hoje" className="flex size-12 items-center justify-center rounded-full">
          <ArrowLeft size={26} aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">Configurações</h1>
      </header>
      <main className="flex flex-col gap-4 px-4 pt-4">
        <SecaoContas />
        <SecaoNotificacoes />
        <SecaoFonte />
        <Cartao>
          <h2 className="text-xl font-bold">Sua conta</h2>
          <p className="mt-1 mb-3 text-base break-all text-suave">Entrou como {email}</p>
          <form
            action={async () => {
              await limparDadosLocais()
              await sair()
            }}
          >
            <Botao type="submit" className="w-full">
              Sair
            </Botao>
          </form>
        </Cartao>
      </main>
    </>
  )
}
