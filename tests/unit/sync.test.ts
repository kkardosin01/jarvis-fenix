import { describe, expect, it, vi } from 'vitest'
import { Planilha, type SheetsApi } from '../../src/lib/sheets'
import { analisarMensagem } from '../../src/lib/mail/imap'
import { estadoVazio, normalizarEstado, prepararPanorama, sincronizarConta, type Buscar, type ContaSync } from '../../src/lib/mail/sync'
import { formatarLinhaDigitavel } from 'jarvis-fenix-core/boleto-codigo'
import { emailCartao, emailCondominio, emailEscola, emailFuturo, emailLuz, emailPropaganda, linhaCondominio } from '../fixtures/emails'

const CAB_OUTRAS = ['vencimento', 'beneficiario', 'valor', 'conta', 'origem', 'situacao', 'como_pagar', 'observacao', 'conta_email', 'id_mensagem']
const CAB_BOLETOS = ['vencimento', 'beneficiario', 'valor', 'conta', 'origem', 'situacao', 'como_pagar', 'observacao']
const CAB_MANUAL = ['vencimento (AAAA-MM-DD)', 'beneficiario', 'valor', 'conta (PJ ou PF)', 'pago? (sim/não)', 'observacao']

function api(abas: Record<string, string[][]>): SheetsApi {
  const nome = (r: string): string => r.replace(/^'/, '').replace(/'.*$/, '')
  return {
    async lerValores(ranges) {
      return ranges.map((r) => (r.includes('!1:1') ? abas[nome(r)]!.slice(0, 1) : abas[nome(r)]!.map((l) => [...l])))
    },
    async acrescentar(r, v) {
      abas[nome(r)]!.push(...v.map((l) => l.map(String)))
    },
    async atualizar(r, v) {
      const m = /!([A-Z]+)(\d+)$/.exec(r)!
      abas[nome(r)]![Number(m[2]) - 1]![m[1]!.charCodeAt(0) - 65] = String(v[0]![0])
    },
    async idDaAba(a) {
      return Object.keys(abas).indexOf(a)
    },
    async removerLinhas(id, ns) {
      const a = Object.keys(abas)[id]!
      for (const n of [...ns].sort((x, y) => y - x)) abas[a]!.splice(n - 1, 1)
    }
  }
}

const CONTA: ContaSync = { id: 'c1', email: 'pessoa.teste@exemplo.com', apelido: 'Pessoal do Tulio', contaBoleto: 'PF' }

async function fonte(...emails: Buffer[]) {
  const msgs = await Promise.all(emails.map((e) => analisarMensagem(e, 'r')))
  const buscar: Buscar = async ({ jaProcessados, aoEncontrar }) => {
    for (const m of msgs) if (!jaProcessados.has(m.messageId)) await aoEncontrar(m)
    return { lidas: msgs.length, pendente: false }
  }
  return buscar
}

describe('sincronização', () => {
  it('grava os boletos na janela, sem duplicar, e guarda os futuros', async () => {
    const abas = {
      Boletos: [CAB_BOLETOS, ['2026-10-25', 'Escola Fictícia', '450,00', 'PF', 'E-mail', '', '', '']],
      Boletos_Manual: [CAB_MANUAL],
      Boletos_Outras_Contas: [CAB_OUTRAS]
    }
    const planilha = new Planilha(api(abas))
    const novos = vi.fn()
    const deps = {
      planilha,
      hoje: '2026-10-19',
      agora: Date.parse('2026-10-19T15:00:00Z'),
      pagosOutras: new Set<string>(),
      buscar: await fonte(emailCondominio, emailLuz, emailEscola, emailPropaganda, emailFuturo, emailCartao),
      aoNovoBoleto: novos
    }
    const estado = estadoVazio()
    const panorama = await prepararPanorama(planilha, deps.hoje, deps.pagosOutras)
    const r = await sincronizarConta(CONTA, estado, panorama, deps)

    // Condomínio, luz e cartão gravados; escola já estava na aba Boletos (duplicado); propaganda ignorada; seguro guardado
    expect(r.novos).toBe(3)
    expect(novos).toHaveBeenCalledTimes(3)
    const linhas = abas.Boletos_Outras_Contas.slice(1)
    expect(linhas.map((l) => l[1])).toEqual(['Condominio Residencial Exemplo', 'Energia Fictícia', 'Cartão Fictício'])
    expect(linhas[0]).toEqual([
      '2026-10-22',
      'Condominio Residencial Exemplo',
      '850',
      'PF',
      'E-mail Pessoal do Tulio',
      'Próximos dias',
      formatarLinhaDigitavel(linhaCondominio),
      '',
      'pessoa.teste@exemplo.com',
      '<condominio-001@exemplo>'
    ])
    expect(linhas[1]![5]).toBe('Vence hoje')
    expect(linhas[2]!.slice(2, 8)).toEqual(['', 'PF', 'E-mail Pessoal do Tulio', 'Próximos dias', 'PDF anexo no e-mail de Cartão Fictício (19/10)', 'Valor no PDF'])
    expect(estado.futuros.map((f) => f.vencimento)).toEqual(['2026-11-30'])

    // Segunda rodada: nada novo (processados + deduplicação)
    const p2 = await prepararPanorama(planilha, deps.hoje, deps.pagosOutras)
    const r2 = await sincronizarConta(CONTA, estado, p2, deps)
    expect(r2.novos).toBe(0)
    expect(abas.Boletos_Outras_Contas).toHaveLength(4)
  })

  it('futuro entra na planilha quando chega a 7 dias do vencimento', async () => {
    const abas = { Boletos: [CAB_BOLETOS], Boletos_Manual: [CAB_MANUAL], Boletos_Outras_Contas: [CAB_OUTRAS] }
    const planilha = new Planilha(api(abas))
    const estado = estadoVazio()
    const base = { planilha, pagosOutras: new Set<string>(), buscar: await fonte(emailFuturo) }
    await sincronizarConta(CONTA, estado, await prepararPanorama(planilha, '2026-10-19', base.pagosOutras), {
      ...base,
      hoje: '2026-10-19',
      agora: Date.parse('2026-10-19T15:00:00Z')
    })
    expect(abas.Boletos_Outras_Contas).toHaveLength(1)
    const r = await sincronizarConta(CONTA, estado, await prepararPanorama(planilha, '2026-11-24', base.pagosOutras), {
      ...base,
      hoje: '2026-11-24',
      agora: Date.parse('2026-11-24T15:00:00Z')
    })
    expect(r.novos).toBe(1)
    expect(abas.Boletos_Outras_Contas[1]![5]).toBe('Próximos dias')
    expect(estado.futuros).toEqual([])
  })

  it('limpeza: remove pagos e vencidos há mais de 30 dias, recalcula situação', async () => {
    const abas = {
      Boletos: [CAB_BOLETOS],
      Boletos_Manual: [CAB_MANUAL],
      Boletos_Outras_Contas: [
        CAB_OUTRAS,
        ['2026-09-01', 'Antigo', '10', 'PF', 'E-mail X', 'Atrasado', '', '', 'a@x', '<antigo@x>'],
        ['2026-10-18', 'Ontem', '10', 'PF', 'E-mail X', 'Vence hoje', '', '', 'a@x', '<ontem@x>'],
        ['2026-10-20', 'Pago', '10', 'PF', 'E-mail X', 'Próximos dias', '', '', 'a@x', '<pago@x>']
      ]
    }
    const planilha = new Planilha(api(abas))
    const p = await prepararPanorama(planilha, '2026-10-19', new Set(['outras:<pago@x>']))
    expect(abas.Boletos_Outras_Contas.map((l) => l[1])).toEqual(['beneficiario', 'Ontem'])
    expect(abas.Boletos_Outras_Contas[1]![5]).toBe('Atrasado')
    // O pago continua nas chaves, para não ser regravado
    expect(p.existentes.ids.has('<pago@x>')).toBe(true)
  })

  it('continua de onde parou quando bate o limite da execução', async () => {
    const abas = { Boletos: [CAB_BOLETOS], Boletos_Manual: [CAB_MANUAL], Boletos_Outras_Contas: [CAB_OUTRAS] }
    const planilha = new Planilha(api(abas))
    const msgs = await Promise.all([emailLuz, emailCondominio].map((e) => analisarMensagem(e, 'r')))
    const desdes: Date[] = []
    // Imita o IMAP: lê no máximo 1 mensagem por execução e avança o cursor
    const buscar: Buscar = async ({ desde, cursor, aoEncontrar }) => {
      desdes.push(desde)
      const pos = cursor.INBOX?.ultimoUid ?? 0
      const m = msgs[pos]
      if (m) await aoEncontrar(m)
      cursor.INBOX = { uidValidity: '1', ultimoUid: pos + 1 }
      return { lidas: m ? 1 : 0, pendente: pos + 1 < msgs.length }
    }
    const estado = estadoVazio()
    const t1 = Date.parse('2026-10-19T11:45:00Z')
    const r1 = await sincronizarConta(CONTA, estado, await prepararPanorama(planilha, '2026-10-19', new Set()), { planilha, hoje: '2026-10-19', agora: t1, buscar })
    expect(r1).toMatchObject({ novos: 1, pendente: true })
    expect(estado.ultimaSync).toBeNull()
    expect(estado.emAndamentoDesde).toBe(t1)

    const t2 = t1 + 3_600_000
    const r2 = await sincronizarConta(CONTA, estado, await prepararPanorama(planilha, '2026-10-19', new Set()), { planilha, hoje: '2026-10-19', agora: t2, buscar })
    expect(r2).toMatchObject({ novos: 1, pendente: false })
    // A varredura conta a partir do início da primeira execução (45 dias antes dela)
    expect(desdes[1]!.getTime()).toBe(t1 - 45 * 86_400_000)
    expect(estado.ultimaSync).toBe(t1)
    expect(estado.emAndamentoDesde).toBeNull()
    expect(abas.Boletos_Outras_Contas).toHaveLength(3)
  })

  it('estado salvo incompleto vira estado válido', () => {
    expect(normalizarEstado(null)).toEqual(estadoVazio())
    expect(normalizarEstado({ ultimaSync: 5, cursor: { INBOX: { uidValidity: '9', ultimoUid: 3 } } })).toMatchObject({ ultimaSync: 5, futuros: [] })
  })
})
