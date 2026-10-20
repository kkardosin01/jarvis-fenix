import { describe, expect, it } from 'vitest'
import { decidirBomDia, horarioSilencioso, resumoDeHoje, textoBomDia, textoNovoBoleto } from '../../src/lib/notificacao'
import type { Conta, DadosPainel } from '../../src/core/types'

function conta(situacao: Conta['situacao'], valor: number | null = 10, beneficiario = 'Luz'): Conta {
  return {
    chave: Math.random().toString(),
    fonte: 'Boletos',
    vencimento: '2026-10-20',
    beneficiario,
    valor,
    conta: 'PJ',
    origem: '',
    situacao,
    comoPagar: '',
    observacao: '',
    contaEmail: '',
    idMensagem: '',
    linhaDigitavel: null,
    pix: null,
    linhaPlanilha: 2
  }
}

function dados(p: { contas?: Conta[]; contatos?: number; atualizado?: string | null }): DadosPainel {
  return {
    resumo: {
      atualizadoEm: '',
      atualizadoEmISO: p.atualizado === undefined ? '2026-10-20T11:40:00.000Z' : p.atualizado,
      fraseDoDia: '',
      emailsRelevantes: null,
      boletosHoje: null,
      boletosAtrasados: null,
      boletosValorConhecido: null,
      contatosHoje: null,
      rascunhosProspeccao: null,
      detalhes: {}
    },
    prioridades: [],
    emails: [],
    contas: p.contas ?? [],
    contatos: Array.from({ length: p.contatos ?? 0 }, (_, i) => ({
      cliente: `C${i}`,
      cidade: '',
      contato: '',
      telefone: '',
      ultimaCompra: '',
      diasSemComprar: null,
      motivo: '',
      mensagemSugerida: ''
    })),
    prospects: []
  }
}

// 20/10/2026 em Brasília (UTC-3)
const as = (h: number, m: number): Date => new Date(Date.UTC(2026, 9, 20, h + 3, m))

describe('texto do bom dia', () => {
  it('só com números maiores que zero', () => {
    expect(textoBomDia('Tulio', dados({ contas: [conta('Vence hoje'), conta('Vence hoje'), conta('Atrasado'), conta('Atrasado'), conta('Atrasado')], contatos: 6 }))).toBe(
      'Bom dia, Tulio! 2 contas vencem hoje, 3 atrasadas e 6 clientes para ligar.'
    )
    expect(textoBomDia('Tulio', dados({ contas: [conta('Vence hoje')] }))).toBe('Bom dia, Tulio! 1 conta vence hoje.')
    expect(textoBomDia('Tulio', dados({ contas: [conta('Próximos dias')], contatos: 1 }))).toBe('Bom dia, Tulio! 1 cliente para ligar.')
    expect(textoBomDia('Tulio', dados({}))).toMatch(/Nenhuma conta vencendo hoje/)
  })

  it('boleto novo', () => {
    expect(textoNovoBoleto({ beneficiario: 'Celesc', vencimento: '2026-10-22', valor: 230.1 })).toBe('Novo boleto: Celesc — vence 22/10 — R$ 230,10')
    expect(textoNovoBoleto({ beneficiario: 'Casan', vencimento: '2026-10-22', valor: null })).toBe('Novo boleto: Casan — vence 22/10 — valor no PDF')
  })
})

describe('resumo de hoje', () => {
  it('compara a data em Brasília', () => {
    expect(resumoDeHoje(dados({}), as(9, 5))).toBe(true)
    expect(resumoDeHoje(dados({ atualizado: '2026-10-19T23:40:00.000Z' }), as(9, 5))).toBe(false) // 20h40 do dia 19
    expect(resumoDeHoje(dados({ atualizado: null }), as(9, 5))).toBe(false)
  })
})

describe('bom dia às 9h05 e nova tentativa às 9h35', () => {
  it('resumo pronto: manda uma vez só', () => {
    expect(decidirBomDia('primeira', null, true)).toEqual({ enviar: 'bomDia', novoEstado: 'completo' })
    expect(decidirBomDia('segunda', 'completo', true)).toEqual({ enviar: null, novoEstado: 'completo' })
  })
  it('resumo atrasado: avisa às 9h05 e manda o bom dia às 9h35 se ficou pronto', () => {
    expect(decidirBomDia('primeira', null, false)).toEqual({ enviar: 'pendente', novoEstado: 'pendente' })
    expect(decidirBomDia('segunda', 'pendente', true)).toEqual({ enviar: 'bomDia', novoEstado: 'completo' })
  })
  it('continua atrasado às 9h35: não insiste', () => {
    expect(decidirBomDia('segunda', 'pendente', false)).toEqual({ enviar: null, novoEstado: 'pendente' })
  })
  it('se o cron das 9h35 rodar antes do das 9h05 (plano Hobby), não duplica', () => {
    expect(decidirBomDia('segunda', null, false)).toEqual({ enviar: 'pendente', novoEstado: 'pendente' })
    expect(decidirBomDia('primeira', 'pendente', false)).toEqual({ enviar: null, novoEstado: 'pendente' })
  })
  it('silêncio entre 22h e 7h', () => {
    expect(horarioSilencioso(22)).toBe(true)
    expect(horarioSilencioso(6)).toBe(true)
    expect(horarioSilencioso(7)).toBe(false)
    expect(horarioSilencioso(21)).toBe(false)
  })
})
