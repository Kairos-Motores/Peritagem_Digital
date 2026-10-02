import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Passos do guia. Cada um é curto de propósito: é lido em pé, no chão de
// fábrica, muitas vezes na primeira vez que o peritador abre o app.
const PASSOS = [
  {
    icone: 'waving_hand',
    titulo: 'Bem-vindo à Peritagem Digital',
    texto: 'Este guia mostra, em poucos passos, como fazer uma peritagem do começo ao fim. Você pode reabri-lo quando quiser pelo botão de ajuda no topo da tela.',
  },
  {
    icone: 'home',
    titulo: 'Tela inicial',
    texto: '"Em andamento" traz as peritagens que você já começou, com a barra de progresso. "OS pendentes de peritagem" é a fila da sua filial. Toque e segure um card para ver um resumo rápido.',
  },
  {
    icone: 'add_circle',
    titulo: 'Abrir uma peritagem',
    texto: 'Toque em uma OS da fila ou use "Nova Inspeção" para digitar o número. O app confere se a OS existe antes de liberar o preenchimento.',
  },
  {
    icone: 'account_tree',
    titulo: 'Escolha do modelo',
    texto: 'Antes do cabeçalho, escolha o modelo de peritagem do equipamento. Ele define quais itens aparecem no checklist e não pode ser trocado depois que a peritagem começa.',
  },
  {
    icone: 'assignment',
    titulo: 'Cabeçalho em etapas',
    texto: 'Os dados do equipamento são preenchidos por etapas. Em "Dados Técnicos", o botão "Buscar dados técnicos" completa os campos vazios usando a última peritagem do mesmo modelo — ele nunca apaga o que você já digitou.',
  },
  {
    icone: 'checklist',
    titulo: 'Checklist por tipo',
    texto: 'Os itens são separados por tipo. O chip do tipo fica verde quando todos os itens dele estão respondidos. Use a busca e os filtros "Pendentes" e "Concluídos" para achar um item, e a seta para recolher essa área e ver mais itens na tela.',
  },
  {
    icone: 'touch_app',
    titulo: 'Respondendo os itens',
    texto: 'Use os botões + e − ou escolha a opção do item. O campo "Observação" guarda detalhes. "Marcar todos OK" responde de uma vez o que falta no tipo, e "Desfazer" volta a última alteração.',
  },
  {
    icone: 'photo_camera',
    titulo: 'Fotos',
    texto: 'O botão "Fotos" dentro do item abre a câmera, com controle de flash. Cada foto fica ligada ao item. No álbum da peritagem você escolhe quais fotos entram nas 18 posições numeradas.',
  },
  {
    icone: 'tab',
    titulo: 'Várias peritagens abertas',
    texto: 'O botão + no topo deixa você manter até 3 peritagens abertas e alternar entre elas. O que já foi digitado é salvo antes de cada troca.',
  },
  {
    icone: 'cloud_off',
    titulo: 'Funciona sem internet',
    texto: 'Dá para peritar sem sinal: tudo fica guardado no aparelho e sobe sozinho quando a conexão voltar. O indicador na tela inicial mostra quantas peritagens ainda estão para sincronizar.',
  },
  {
    icone: 'check_circle',
    titulo: 'Pronto para começar',
    texto: 'É isso. Sempre que precisar rever alguma parte, toque no botão de ajuda na barra do topo.',
  },
];

// O provider monta este componente só enquanto o guia está aberto, então
// reabrir sempre começa do primeiro passo.
export default function GuiaApp({ onFechar }) {
  const [passo, setPasso] = useState(0);

  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;
  const avancar = () => (ultimo ? onFechar() : setPasso(p => p + 1));
  const voltar = () => setPasso(p => Math.max(0, p - 1));

  const botaoBase = {
    minHeight: 48,
    padding: '12px 20px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 5000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          paddingTop: 'calc(16px + env(safe-area-inset-top))',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Guia do aplicativo"
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          style={{
            display: 'flex', flexDirection: 'column',
            width: '100%', maxWidth: 460, maxHeight: '100%',
            backgroundColor: 'var(--md-sys-color-surface)',
            color: 'var(--md-sys-color-on-surface)',
            borderRadius: 'var(--md-sys-shape-corner-large)',
            boxShadow: 'var(--md-sys-elevation-3)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 12px 12px 20px', borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Guia · {passo + 1} de {PASSOS.length}
            </span>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar guia"
              className="topbar-icon-btn"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={passo}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}
              >
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 72, height: 72, borderRadius: '50%',
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 38 }}>{atual.icone}</span>
                </span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--md-sys-color-primary)' }}>{atual.titulo}</h2>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {atual.texto}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {PASSOS.map((p, i) => (
                <button
                  key={p.icone}
                  type="button"
                  onClick={() => setPasso(i)}
                  aria-label={`Ir para o passo ${i + 1}: ${p.titulo}`}
                  aria-current={i === passo}
                  style={{
                    width: i === passo ? 22 : 8, height: 8, padding: 0,
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    backgroundColor: i === passo ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
                    transition: 'width 0.2s, background-color 0.2s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {passo > 0 ? (
                <button
                  type="button"
                  onClick={voltar}
                  style={{
                    ...botaoBase, flex: 1,
                    border: '1px solid var(--md-sys-color-outline)',
                    background: 'transparent', color: 'var(--md-sys-color-on-surface)',
                  }}
                >
                  Anterior
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFechar}
                  style={{
                    ...botaoBase, flex: 1,
                    border: '1px solid var(--md-sys-color-outline)',
                    background: 'transparent', color: 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  Pular
                </button>
              )}
              <button
                type="button"
                onClick={avancar}
                style={{
                  ...botaoBase, flex: 2, border: 'none',
                  backgroundColor: 'var(--md-sys-color-primary)', color: '#fff',
                }}
              >
                {ultimo ? 'Começar' : 'Próximo'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
