// Passos do formulário de cabeçalho, cada um com seus campos obrigatórios.
// A soma de identificacao + tecnico + equipe é igual a
// CAMPOS_CABECALHO_OBRIGATORIOS. O modelo de peritagem fica de fora dessa
// lista de propósito: é exigido ao salvar no formulário, mas peritagens
// antigas (sem modelo) precisam continuar liberando o checklist.
export const CAMPOS_POR_STEP = {
  modelo: ['cr4a1_modeloperitagem'],
  identificacao: ['cr4a1_area', 'cr4a1_n_serie', 'cr4a1_os_retorno'],
  tecnico: [
    'cr4a1_tensao', 'cr4a1_corrente', 'cr4a1_modelo', 'cr4a1_fabricante', 'cr4a1_carcaca',
    'cr4a1_potencia_cv', 'cr4a1_potencia_kw', 'cr4a1_tag_cliente', 'cr4a1_rpm', 'cr4a1_polos',
    'cr4a1_classe', 'cr4a1_fs', 'cr4a1_ip', 'cr4a1_cat', 'cr4a1_reg', 'cr4a1_fc', 'cr4a1_frequencia',
    'cr4a1_peso', 'cr4a1_n_req', 'cr4a1_tag_kairos', 'cr4a1_comprimento', 'cr4a1_largura', 'cr4a1_altura',
    'cr4a1_me',
  ],
  equipe: ['cr4a1_mecanico'],
};

// Campos técnicos que costumam ser os mesmos pra todo motor do mesmo
// modelo/fabricante (vêm da placa de identificação) — usados pela busca
// automática opcional no passo "Dados Técnicos". Dados específicos da OS
// atual (nº série, tags, requisição etc.) ficam de fora de propósito.
export const CAMPOS_TECNICOS_MODELO = [
  'cr4a1_tensao', 'cr4a1_corrente', 'cr4a1_carcaca', 'cr4a1_potencia_cv', 'cr4a1_potencia_kw',
  'cr4a1_rpm', 'cr4a1_polos', 'cr4a1_classe', 'cr4a1_fs', 'cr4a1_ip', 'cr4a1_cat', 'cr4a1_reg',
  'cr4a1_fc', 'cr4a1_frequencia', 'cr4a1_peso', 'cr4a1_comprimento', 'cr4a1_largura', 'cr4a1_altura',
  'cr4a1_me',
];

// Campos do cabeçalho que o peritador precisa preencher para liberar o checklist
export const CAMPOS_CABECALHO_OBRIGATORIOS = [
  ...CAMPOS_POR_STEP.identificacao,
  ...CAMPOS_POR_STEP.tecnico,
  ...CAMPOS_POR_STEP.equipe,
];

export function camposCompletos(dados, campos) {
  if (!dados) return false;
  return campos.every(campo => dados[campo]?.toString().trim().length > 0);
}

export function cabecalhoCompleto(cabecalho) {
  return camposCompletos(cabecalho, CAMPOS_CABECALHO_OBRIGATORIOS);
}
