// Notificação diária das 9h05 (e nova tentativa às 9h35).

import 'server-only'
import { hojeISO } from '@/core/ptbr'
import { carregarPainel } from './dados'
import { gravarEstado, lerEstado } from './estado'
import { decidirBomDia, resumoDeHoje, TEXTO_RESUMO_ATRASADO, textoBomDia, type EstadoBomDia } from './notificacao'
import { enviarParaTodos } from './push'

export async function notificarBomDia(tentativa: 'primeira' | 'segunda') {
  const agora = new Date()
  const chave = `bom_dia:${hojeISO(agora)}`
  const estado = (await lerEstado(chave)) as EstadoBomDia
  const { dados } = await carregarPainel()
  const pronto = resumoDeHoje(dados, agora)
  const d = decidirBomDia(tentativa, estado, pronto)
  let envio = null
  if (d.enviar) {
    envio = await enviarParaTodos({
      titulo: 'Jarvis Fênix',
      corpo: d.enviar === 'bomDia' ? textoBomDia('Tulio', dados) : TEXTO_RESUMO_ATRASADO,
      url: '/',
      tag: 'bom-dia'
    })
  }
  if (d.novoEstado !== estado && d.novoEstado) await gravarEstado(chave, d.novoEstado)
  return { tentativa, pronto, enviado: d.enviar, envio }
}
