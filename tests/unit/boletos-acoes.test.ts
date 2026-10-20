import { beforeEach, describe, expect, it, vi } from 'vitest'
import { paraConta } from 'jarvis-fenix-core/boletos'
import { Planilha, type SheetsApi } from '../../src/lib/sheets'

const registrados: string[] = []
vi.mock('../../src/lib/pagos-db', () => ({ registrarPago: async (chave: string) => void registrados.push(chave) }))

const { lancarBoleto, marcarPago, ErroUsuario } = await import('../../src/lib/boletos-acoes')

const CAB_MANUAL = ['vencimento (AAAA-MM-DD)', 'beneficiario', 'valor', 'conta (PJ ou PF)', 'pago? (sim/não)', 'observacao']
const CAB_OUTRAS = ['vencimento', 'beneficiario', 'valor', 'conta', 'origem', 'situacao', 'como_pagar', 'observacao', 'conta_email', 'id_mensagem']
const CAB_BOLETOS = ['vencimento', 'beneficiario', 'valor', 'conta', 'origem', 'situacao', 'como_pagar', 'observacao']

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

const HOJE = new Date().toISOString().slice(0, 10)

describe('lançar boleto', () => {
  it('acrescenta em Boletos_Manual na ordem das colunas, com pago? = não', async () => {
    const abas = { Boletos_Manual: [CAB_MANUAL, ['', '', '', '', '', 'Lance aqui os boletos do DDA']] }
    await lancarBoleto(new Planilha(api(abas)), { vencimento: '2026-10-25', beneficiario: 'Celesc', valor: 230.1, conta: 'PF', observacao: 'DDA' })
    expect(abas.Boletos_Manual[2]).toEqual(['2026-10-25', 'Celesc', '230.1', 'PF', 'não', 'DDA'])
  })
})

describe('marcar como pago', () => {
  beforeEach(() => void registrados.splice(0))

  it('Boletos_Manual: acha a linha pelos dados mesmo se ela mudou de lugar', async () => {
    const abas = {
      Boletos_Manual: [
        CAB_MANUAL,
        ['', '', '', '', '', 'instrução'],
        ['2026-10-20', 'Aluguel', '2.100,00', 'PJ', 'não', ''],
        ['2026-10-21', 'Internet', '99,90', 'PJ', 'não', '']
      ]
    }
    const planilha = new Planilha(api(abas))
    // O navegador viu "Internet" na linha 4; alguém apagou uma linha acima e ela foi para a 3
    const chave = paraConta('Boletos_Manual', { 'vencimento (AAAA-MM-DD)': '2026-10-21', beneficiario: 'Internet', valor: '99,90' }, 4, HOJE).chave
    abas.Boletos_Manual.splice(1, 1)
    await marcarPago(planilha, chave, 'tulio@exemplo.com')
    expect(abas.Boletos_Manual.map((l) => l[4])).toEqual(['pago? (sim/não)', 'não', 'sim'])
  })

  it('Boletos_Manual: erro claro se não achar', async () => {
    const planilha = new Planilha(api({ Boletos_Manual: [CAB_MANUAL] }))
    await expect(marcarPago(planilha, 'manual:2:x|2026-10-21|1', 't@x')).rejects.toBeInstanceOf(ErroUsuario)
  })

  it('Boletos_Outras_Contas: registra o id e remove a linha certa', async () => {
    const abas = {
      Boletos_Outras_Contas: [
        CAB_OUTRAS,
        ['2026-10-22', 'Condomínio', '850', 'PF', 'E-mail X', 'Próximos dias', '', '', 'a@x', '<c@x>'],
        ['2026-10-23', 'Escola', '450', 'PF', 'E-mail X', 'Próximos dias', '', '', 'a@x', '<e@x>']
      ]
    }
    await marcarPago(new Planilha(api(abas)), 'outras:<e@x>', 't@x')
    expect(registrados).toEqual(['outras:<e@x>'])
    expect(abas.Boletos_Outras_Contas.map((l) => l[1])).toEqual(['beneficiario', 'Condomínio'])
  })

  it('Boletos (nuvem): guarda beneficiário + vencimento e não escreve na aba', async () => {
    const abas = { Boletos: [CAB_BOLETOS, ['2026-10-20', 'Receita Federal – DAS', '1.234,56', 'PJ', 'E-mail', 'Vence hoje', '', '']] }
    const antes = JSON.stringify(abas)
    const chave = paraConta('Boletos', Object.fromEntries(CAB_BOLETOS.map((h, i) => [h, abas.Boletos[1]![i]!])), 2, HOJE).chave
    await marcarPago(new Planilha(api(abas)), chave, 't@x')
    expect(registrados).toEqual(['nuvem:receita federal das|2026-10-20'])
    expect(JSON.stringify(abas)).toBe(antes)
  })

  it('nunca escreve fora de Boletos_Manual e Boletos_Outras_Contas', async () => {
    const planilha = new Planilha(api({ Resumo: [['chave', 'valor']] }))
    await expect(planilha.acrescentar('Resumo', { chave: 'x' })).rejects.toThrow(/Escrita bloqueada/)
    await expect(planilha.atualizarCelula('Boletos', 2, 'valor', '1')).rejects.toThrow(/Escrita bloqueada/)
  })
})
