import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { chaveBeneficiario } from 'jarvis-fenix-core/boletos'
import type { Conta } from 'jarvis-fenix-core/types'
import { normalizarTelefone, linksWhatsApp } from 'jarvis-fenix-core/whatsapp'
import { cifrar, decifrar } from '../../src/lib/cripto'
import { painelDemo } from '../../src/lib/demo'
import { chavePagoNuvem, chavePagoOutras, esconderPagos } from '../../src/lib/pagos'
import { idsPagosOutras } from '../../src/lib/mail/sync'
import { origemFiltro, tomSituacao } from '../../src/lib/visao'

function conta(p: Partial<Conta>): Conta {
  return {
    chave: 'x',
    fonte: 'Boletos',
    vencimento: '2026-10-20',
    beneficiario: 'Celesc',
    valor: 10,
    conta: 'PJ',
    origem: '',
    situacao: 'Vence hoje',
    comoPagar: '',
    observacao: '',
    contaEmail: '',
    idMensagem: '',
    linhaDigitavel: null,
    pix: null,
    linhaPlanilha: 2,
    ...p
  }
}

describe('telefone para o WhatsApp', () => {
  it('tira o 0 do DDD', () => {
    expect(normalizarTelefone('(048) 99915-2015')).toBe('5548999152015')
    expect(normalizarTelefone('048 3283 2293')).toBe('554832832293')
  })
  it('sem DDD não monta link (a tela mostra só "Copiar mensagem")', () => {
    expect(normalizarTelefone('99915-2015')).toBeNull()
    expect(normalizarTelefone('3283-2293')).toBeNull()
    expect(linksWhatsApp('3283-2293', 'oi')).toBeNull()
  })
  it('link wa.me com a mensagem codificada', () => {
    expect(linksWhatsApp('(48) 3283-2293', 'Oi & tchau')?.web).toBe('https://wa.me/554832832293?text=Oi%20%26%20tchau')
  })
})

describe('senha de app cifrada', () => {
  const k = randomBytes(32)
  it('ida e volta', () => {
    const c = cifrar('abcd efgh ijkl mnop', k)
    expect(c).toMatch(/^v1\./)
    expect(c).not.toContain('abcd')
    expect(decifrar(c, k)).toBe('abcd efgh ijkl mnop')
  })
  it('cada cifragem é diferente e a chave errada falha', () => {
    expect(cifrar('x', k)).not.toBe(cifrar('x', k))
    expect(() => decifrar(cifrar('x', k), randomBytes(32))).toThrow()
  })
})

describe('boletos pagos fora da planilha', () => {
  it('esconde o da nuvem por beneficiário + vencimento e o de outras contas por id', () => {
    const pagos = new Set([chavePagoNuvem('CELESC ', '2026-10-20'), chavePagoOutras('<a@x>')])
    const contas = [
      conta({ chave: 'n1' }),
      conta({ chave: 'n2', vencimento: '2026-11-20' }),
      conta({ chave: 'o1', fonte: 'Boletos_Outras_Contas', idMensagem: '<a@x>' }),
      conta({ chave: 'o2', fonte: 'Boletos_Outras_Contas', idMensagem: '<b@x>' }),
      conta({ chave: 'm1', fonte: 'Boletos_Manual' })
    ]
    expect(esconderPagos(contas, pagos).map((c) => c.chave)).toEqual(['n2', 'o2', 'm1'])
    expect([...idsPagosOutras(pagos)]).toEqual(['<a@x>'])
  })
})

describe('telas', () => {
  it('cores da situação', () => {
    expect(tomSituacao('Atrasado')).toBe('perigo')
    expect(tomSituacao('Vence hoje')).toBe('alerta')
    expect(tomSituacao('Próximos dias')).toBe('neutro')
  })
  it('origem do filtro', () => {
    expect(origemFiltro(conta({}))).toBe('Empresa')
    expect(origemFiltro(conta({ fonte: 'Boletos_Manual' }))).toBe('Lançado à mão')
    expect(origemFiltro(conta({ fonte: 'Boletos_Outras_Contas', origem: 'E-mail Pessoal do Tulio' }))).toBe('E-mail Pessoal do Tulio')
  })
  it('dados de demonstração passam pela conversão real', () => {
    const p = painelDemo(new Date('2026-10-20T12:00:00Z'))
    expect(p.dados.resumo.atualizadoEmISO).toBe('2026-10-20T11:40:00.000Z')
    expect(p.dados.contas.map((c) => c.fonte)).toContain('Boletos_Manual')
    expect(p.dados.contas.find((c) => c.beneficiario === 'Receita Federal – DAS')?.valor).toBe(1234.56)
    expect(p.dados.prioridades).toHaveLength(3)
    expect(chaveBeneficiario('Aluguel da sala', '2026-10-20', 2100)).toBe('aluguel da sala|2026-10-20|210000')
  })
})
