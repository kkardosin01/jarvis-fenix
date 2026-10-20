// Dados FICTÍCIOS para o modo demonstração (só em desenvolvimento, JARVIS_DEMO=1).
// Passam pela mesma conversão da planilha real, então a tela fica igual.

import { hojeISO, somarDias } from 'jarvis-fenix-core/ptbr'
import { matrizParaLinhas, type Aba, type AbaLida } from './sheets'
import { montarDados } from './painel'
import type { RespostaPainel } from './tipos'

export function painelDemo(agora = new Date()): RespostaPainel {
  const hoje = hojeISO(agora)
  const d = (n: number): string => somarDias(hoje, n)
  const br = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
  const m: Record<Aba, string[][]> = {
    Resumo: [
      ['chave', 'valor', 'detalhe'],
      ['atualizado_em', `${br(hoje)} 08:40`, ''],
      ['frase_do_dia', 'Dia de cobrar a Clínica Exemplo e confirmar a entrega do CG8+ para Joinville.', ''],
      ['emails_relevantes', '3', ''],
      ['boletos_hoje', '2', ''],
      ['boletos_atrasados', '1', ''],
      ['boletos_valor_conhecido', '1.234,56', ''],
      ['contatos_hoje', '2', ''],
      ['rascunhos_prospeccao', '5', '']
    ],
    Prioridades: [
      ['ordem', 'prioridade', 'por_que'],
      ['1', 'Pagar a guia do DAS', 'Vence hoje e não tem débito automático'],
      ['2', 'Ligar para a Clínica Exemplo', '45 dias sem comprar CG4+'],
      ['3', 'Revisar os 5 rascunhos de prospecção', 'Hospitais veterinários de Curitiba']
    ],
    Emails: [
      ['recebido_em', 'remetente', 'assunto', 'resumo', 'categoria', 'acao', 'urgencia'],
      [`${br(hoje)} 07:12`, 'Hospital Fictício', 'Cotação de cTnI', 'Pedem preço de 4 caixas de cTnI com entrega em 5 dias.', 'Cotação', 'Responder com a proposta', 'Alta'],
      [`${br(d(-1))} 16:40`, 'Fornecedor Exemplo', 'Previsão de embarque', 'Lote de CG8+ chega na quinta.', 'Fornecedor', 'Avisar clientes que pediram', 'Média'],
      [`${br(d(-1))} 10:05`, 'Contabilidade Teste', 'Honorários de outubro', 'Boleto dos honorários anexo.', 'Financeiro', 'Conferir boleto', 'Baixa']
    ],
    Boletos: [
      ['vencimento', 'beneficiario', 'valor', 'conta', 'origem', 'situacao', 'como_pagar', 'observacao'],
      [d(0), 'Receita Federal – DAS', '1.234,56', 'PJ', 'E-mail empresa', 'Vence hoje', '', ''],
      [d(-3), 'Contabilidade Teste', '', 'PJ', 'E-mail empresa', 'Atrasado', 'PDF anexo', ''],
      [d(4), 'Transportadora Fictícia', '310,00', 'PJ', 'E-mail empresa', 'Próximos dias', '', '']
    ],
    Boletos_Manual: [
      ['vencimento (AAAA-MM-DD)', 'beneficiario', 'valor', 'conta (PJ ou PF)', 'pago? (sim/não)', 'observacao'],
      [d(0), 'Aluguel da sala', '2.100,00', 'PJ', 'não', 'DDA do banco']
    ],
    Boletos_Outras_Contas: [
      ['vencimento', 'beneficiario', 'valor', 'conta', 'origem', 'situacao', 'como_pagar', 'observacao', 'conta_email', 'id_mensagem'],
      [d(2), 'Energia Fictícia', '230,10', 'PF', 'E-mail Pessoal do Tulio', 'Próximos dias', '83600000002-3 30100001000-1 99999999999-9 99999999999-9', '', 'pessoa@exemplo.com', '<demo-1@exemplo>']
    ],
    Contatos: [
      ['cliente', 'cidade', 'contato', 'telefone', 'ultima_compra', 'dias_sem_comprar', 'motivo', 'mensagem_sugerida'],
      ['Clínica Exemplo', 'Florianópolis', 'Dra. Ana', '(048) 99999-0000', '05/09/2026', '45', 'Costuma comprar CG4+ a cada 30 dias', 'Oi, Dra. Ana! Tudo bem? Vi que faz um tempinho do último pedido de CG4+. Quer que eu separe uma caixa?'],
      ['Hospital Veterinário Teste', 'Joinville', 'Carlos', '3333-0000', '20/08/2026', '61', 'Parou de comprar Chem8+', 'Oi, Carlos! Como estão as coisas aí? Posso ajudar com o Chem8+ deste mês?']
    ],
    Prospects: [
      ['data', 'empresa', 'segmento', 'cidade', 'email', 'situacao', 'proximo_passo', 'data_proximo_passo'],
      [br(hoje), 'Hospital Veterinário Exemplo', 'Veterinária 24h', 'Curitiba', 'contato@exemplo.com', 'Rascunho criado', 'Revisar e enviar', br(hoje)]
    ]
  }
  const abas = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, matrizParaLinhas(v)])) as Record<Aba, AbaLida>
  return { dados: montarDados(abas, hoje, { nuvem: [], outras: [] }), lidoEm: agora.getTime(), hoje, ultimaSyncEmails: agora.getTime(), demo: true }
}
