// Passos do guia. Cada um aponta para um elemento real da tela (data-guia),
// e o guia mostra só os passos da tela em que o peritador está — assim o
// botão de ajuda explica o que está na frente dele, não um manual genérico.
// Passo sem `alvo` aparece como card central.
export const PASSOS_GUIA = [
  // ---------------- Tela inicial ----------------
  {
    rota: '/home',
    icone: 'waving_hand',
    titulo: 'Bem-vindo',
    texto: 'Vou mostrar esta tela por partes, destacando cada item. Toque em "Próximo" (ou na área destacada) para seguir. O guia fica sempre disponível no botão de ajuda, no topo.',
  },
  {
    rota: '/home',
    alvo: '[data-guia="nova-inspecao"]',
    icone: 'add_circle',
    titulo: 'Começar uma peritagem',
    texto: 'Use este botão quando souber o número da OS. O app confere se ela existe antes de liberar o preenchimento.',
  },
  {
    rota: '/home',
    alvo: '[data-guia="pendentes"]',
    icone: 'inbox',
    titulo: 'Fila da sua filial',
    texto: 'As OS prontas para peritagem aparecem aqui. Toque em uma delas para já começar com o número e o cliente preenchidos.',
  },
  {
    rota: '/home',
    alvo: '[data-guia="em-andamento"]',
    icone: 'pending_actions',
    titulo: 'Peritagens em andamento',
    texto: 'O que você já começou fica aqui, com a barra de progresso. Toque para continuar, ou toque e segure para ver um resumo rápido sem sair da tela.',
  },
  {
    rota: '/home',
    alvo: '[data-guia="sync"]',
    icone: 'cloud_sync',
    titulo: 'Internet e sincronização',
    texto: 'Dá para peritar sem sinal: tudo fica salvo no aparelho. Este indicador mostra quantas peritagens ainda faltam subir e avisa se alguma deu erro.',
  },
  {
    rota: '/home',
    alvo: '[data-guia="nav"]',
    icone: 'bottom_navigation',
    titulo: 'Navegação',
    texto: 'Início, nova inspeção e o histórico de peritagens já concluídas.',
  },
  {
    rota: '/home',
    alvo: '[data-guia="ajuda"]',
    icone: 'help',
    titulo: 'Guia sempre à mão',
    texto: 'Este botão reabre o guia em qualquer tela, explicando o que está visível naquele momento. Abra-o de novo no cabeçalho e no checklist.',
  },

  // ---------------- Cabeçalho ----------------
  {
    rota: '/cabecalho',
    alvo: '[data-guia="passos-cabecalho"]',
    icone: 'format_list_numbered',
    titulo: 'Cabeçalho por etapas',
    texto: 'Os dados do equipamento são preenchidos em etapas, para não virar uma rolagem sem fim. Cada etapa só libera a próxima quando os campos obrigatórios estiverem preenchidos.',
  },
  {
    rota: '/cabecalho',
    alvo: '[data-guia="modelo-peritagem"]',
    icone: 'account_tree',
    titulo: 'Modelo de peritagem',
    texto: 'Escolha o modelo que corresponde ao equipamento. Ele define quais itens vão aparecer no checklist e não pode ser trocado depois que a peritagem começa.',
  },
  {
    rota: '/cabecalho',
    alvo: '[data-guia="buscar-tecnicos"]',
    icone: 'auto_awesome',
    titulo: 'Preencher sem digitar tudo',
    texto: 'Depois de informar o modelo e o fabricante, este botão completa os campos técnicos usando a última peritagem do mesmo motor. Ele só preenche o que está vazio: nada do que você digitou é apagado.',
  },

  // ---------------- Checklist ----------------
  {
    rota: '/checklist',
    alvo: '[data-guia="abas"]',
    icone: 'tab',
    titulo: 'Várias peritagens abertas',
    texto: 'Dá para manter até 3 peritagens abertas e alternar entre elas por estes chips. O que já foi digitado é salvo antes de cada troca.',
  },
  {
    rota: '/checklist',
    alvo: '[data-guia="resumo-checklist"]',
    icone: 'unfold_less',
    titulo: 'Mais espaço para os itens',
    texto: 'Esta barra mostra o tipo atual e o progresso. Toque nela para recolher os filtros e ver mais itens na tela — útil no celular. Ela lembra sua escolha.',
  },
  {
    rota: '/checklist',
    alvo: '[data-guia="tipos"]',
    icone: 'category',
    titulo: 'Tipos de item',
    texto: 'Os itens são separados por tipo. O chip fica verde quando todos os itens daquele tipo estão respondidos. "Marcar todos OK" responde de uma vez o que ainda falta.',
  },
  {
    rota: '/checklist',
    alvo: '[data-guia="busca-item"]',
    icone: 'filter_alt',
    titulo: 'Achar um item',
    texto: 'Busque pelo nome ou use os filtros "Pendentes" e "Concluídos" para ver só o que importa naquele momento.',
  },
  {
    rota: '/checklist',
    alvo: '[data-guia="lista-itens"]',
    icone: 'touch_app',
    titulo: 'Respondendo e fotografando',
    texto: 'Use + e − ou escolha a opção do item, e registre detalhes em "Observação". O botão "Fotos" abre a câmera com flash, e a foto fica ligada àquele item. "Desfazer" volta a última alteração.',
  },

  // ---------------- Detalhe da inspeção ----------------
  {
    rota: '/inspecao',
    alvo: '[data-guia="dados-peritagem"]',
    icone: 'description',
    titulo: 'Dados da peritagem',
    texto: 'Toque no título para recolher os dados do cabeçalho e chegar mais rápido às fotos e aos itens avaliados, logo abaixo.',
  },
  {
    rota: '/inspecao',
    alvo: '[data-guia="album"]',
    icone: 'photo_library',
    titulo: 'Álbum de fotos',
    texto: 'Aqui você escolhe quais fotos entram nas 18 posições numeradas do álbum da peritagem.',
  },

  // ---------------- Telas sem passos próprios ----------------
  {
    rota: '*',
    icone: 'help',
    titulo: 'Guia do aplicativo',
    texto: 'Esta tela não tem explicações próprias. Abra o guia na tela inicial, no cabeçalho ou no checklist para ver o passo a passo com os pontos destacados.',
  },
];

export function passosDaRota(pathname) {
  return PASSOS_GUIA.filter(p => p.rota !== '*' && pathname.startsWith(p.rota));
}
