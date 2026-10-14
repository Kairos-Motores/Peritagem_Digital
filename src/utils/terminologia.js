// Adaptação de terminologia pt-BR -> pt-PT, hoje usada só pela filial Aveiro.
// Dois mecanismos, de propósito:
// - A descrição do item é uma frase curta específica de cada linha da b01
//   (cr4a1_descricaopt, escrita por alguém que conhece o termo certo —
//   evita trocar uma palavra dentro da frase por regex e arriscar errar).
// - Os rótulos de opção (Sim/Não/Bom/Recuperar...) são um vocabulário
//   pequeno e fechado, reaproveitado em várias linhas, então usam uma
//   correspondência exata vinda do glossário em vez de uma coluna por item.
// Em nenhum dos dois casos o dado salvo (chave da opção, cr4a1_descricao)
// muda — só o texto exibido na tela.
const FILIAL_PT = 'Aveiro';

export function descricaoLocalizada(item, filial) {
  const descricaoBr = item?.cr4a1_descricao || '';
  if (filial !== FILIAL_PT) return descricaoBr;
  const descricaoPt = item?.cr4a1_descricaopt?.toString().trim();
  return descricaoPt || descricaoBr;
}

export function rotuloLocalizado(termo, glossario, filial) {
  if (filial !== FILIAL_PT || !termo) return termo;
  return glossario?.get(termo) || termo;
}
