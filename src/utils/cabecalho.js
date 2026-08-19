// Campos do cabeçalho que o peritador precisa preencher para liberar o checklist
export const CAMPOS_CABECALHO_OBRIGATORIOS = [
  'cr4a1_area', 'cr4a1_n_serie', 'cr4a1_os_retorno',
  'cr4a1_tensao', 'cr4a1_corrente', 'cr4a1_modelo', 'cr4a1_fabricante', 'cr4a1_carcaca',
  'cr4a1_potencia_cv', 'cr4a1_potencia_kw', 'cr4a1_tag_cliente', 'cr4a1_rpm', 'cr4a1_polos',
  'cr4a1_classe', 'cr4a1_fs', 'cr4a1_ip', 'cr4a1_cat', 'cr4a1_reg', 'cr4a1_fc', 'cr4a1_frequencia',
  'cr4a1_peso', 'cr4a1_n_req', 'cr4a1_tag_kairos', 'cr4a1_comprimento', 'cr4a1_largura', 'cr4a1_altura',
  'cr4a1_me', 'cr4a1_mecanico',
];

export function cabecalhoCompleto(cabecalho) {
  if (!cabecalho) return false;
  return CAMPOS_CABECALHO_OBRIGATORIOS.every(
    campo => cabecalho[campo]?.toString().trim().length > 0
  );
}
