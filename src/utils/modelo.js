// A coluna cr4a1_modeloperitagem da b01 guarda os IDs (cr4a1_id da tabela
// cr4a1_peritagem_modelo) dos modelos a que a linha pertence, separados por
// ";" — ex.: "1;3;5". Aceita também "," e espaços.
export function idsDoModelo(valor) {
  return (valor ?? '')
    .toString()
    .split(/[;,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Linha sem nenhum modelo informado aparece em todos os modelos; sem modelo
// escolhido (peritagens antigas) aparecem todas as linhas.
export function itemPertenceAoModelo(item, modeloId) {
  if (!modeloId) return true;
  const ids = idsDoModelo(item?.cr4a1_modeloperitagem);
  return ids.length === 0 || ids.includes(String(modeloId).trim());
}

export function filtrarItensPorModelo(itens, modeloId) {
  return (itens || []).filter(item => itemPertenceAoModelo(item, modeloId));
}
