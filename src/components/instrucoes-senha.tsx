// Passo a passo da senha de app, com os "prints" descritos em texto.

export function InstrucoesGmail() {
  return (
    <ol className="list-decimal space-y-3 pl-6 text-base">
      <li>
        No celular ou computador, abra <b>myaccount.google.com/signinoptions/twosv</b> e entre no Gmail pessoal.
        <span className="block text-suave">Você vê uma tela azul e branca “Verificação em duas etapas”. Se estiver desligada, toque em “Ativar” e siga com o seu celular.</span>
      </li>
      <li>
        Depois abra <b>myaccount.google.com/apppasswords</b>.
        <span className="block text-suave">Aparece a tela “Senhas de app”, com um campo “Nome do app”.</span>
      </li>
      <li>
        Escreva <b>Jarvis Fênix</b> e toque em <b>Criar</b>.
        <span className="block text-suave">Abre um quadro amarelo com 16 letras em 4 grupos (ex.: “abcd efgh ijkl mnop”).</span>
      </li>
      <li>Copie as 16 letras e cole no campo “Senha de app” aqui. Os espaços não importam.</li>
      <li>
        Toque em <b>Testar conexão</b> e depois em <b>Salvar conta</b>.
        <span className="block text-suave">Se o teste disser “IMAP desligado”: Gmail → ⚙️ → Ver todas as configurações → Encaminhamento e POP/IMAP → Ativar IMAP.</span>
      </li>
    </ol>
  )
}

export function InstrucoesOutlook() {
  return (
    <ol className="list-decimal space-y-3 pl-6 text-base">
      <li>
        Abra <b>account.live.com/proofs/manage/additional</b> e entre na conta Microsoft (Outlook/Hotmail).
        <span className="block text-suave">Você vê a página “Opções de segurança avançadas”.</span>
      </li>
      <li>
        Em “Verificação em duas etapas”, toque em <b>Ativar</b> e siga os passos.
      </li>
      <li>
        Na mesma página, em <b>Senhas de aplicativo</b>, toque em <b>Criar uma nova senha de aplicativo</b>.
        <span className="block text-suave">Aparece uma senha de letras numa caixa.</span>
      </li>
      <li>Copie e cole no campo “Senha de app” aqui. O servidor (outlook.office365.com) e a porta (993) já vêm preenchidos.</li>
      <li>
        Toque em <b>Testar conexão</b> e depois em <b>Salvar conta</b>.
        <span className="block text-suave">
          A Microsoft vem fechando o acesso por senha em contas pessoais. Se o teste falhar mesmo com a senha de app certa, essa conta não pode ser lida pelo Jarvis.
        </span>
      </li>
    </ol>
  )
}
