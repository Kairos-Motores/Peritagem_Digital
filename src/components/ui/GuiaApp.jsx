import { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PASSOS_GUIA, passosDaRota } from './guiaPassos';

const MARGEM = 12;       // respiro entre o holofote e a borda do elemento
const LARGURA_CARD = 340;

// Sem transição de propósito: animar o tamanho a partir de zero deixa a
// área escura invisível caso a animação não progrida (aba em segundo plano,
// por exemplo). Quem anima o movimento é o anel.
const ESTILO_FAIXA = {
  position: 'fixed', zIndex: 5000, top: 0, left: 0, width: 0, height: 0,
  backgroundColor: 'rgba(0,0,0,0.65)',
};

export default function GuiaApp({ onFechar }) {
  const { pathname } = useLocation();

  // Só os passos desta tela cujo elemento realmente existe. No primeiro
  // login o guia abre enquanto a tela ainda carrega, quando nenhum alvo
  // existe — por isso a lista é reavaliada por alguns instantes.
  const [tentativa, setTentativa] = useState(0);

  const passos = useMemo(() => {
    const daRota = passosDaRota(pathname);
    const visiveis = daRota.filter(p => !p.alvo || document.querySelector(p.alvo));
    // Sempre sobra pelo menos a apresentação da tela
    return visiveis.length > 0 ? visiveis : PASSOS_GUIA.filter(p => p.rota === '*');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, tentativa]);

  useEffect(() => {
    const daRota = passosDaRota(pathname);
    const esperandoAlvos = daRota.some(p => p.alvo) && !daRota.some(p => p.alvo && document.querySelector(p.alvo));
    if (!esperandoAlvos || tentativa >= 12) return;
    const id = setTimeout(() => setTentativa(t => t + 1), 250);
    return () => clearTimeout(id);
  }, [pathname, tentativa]);

  const [indice, setIndice] = useState(0);
  const atual = passos[indice];
  const ultimo = indice === passos.length - 1;

  const anelRef = useRef(null);
  const cardRef = useRef(null);
  // Quatro faixas escuras ao redor do furo. É mais confiável que um
  // box-shadow gigante, que nem sempre repinta ao mover o holofote e pesa
  // na GPU do celular.
  const faixaTopo = useRef(null);
  const faixaBaixo = useRef(null);
  const faixaEsq = useRef(null);
  const faixaDir = useRef(null);

  const avancar = () => (ultimo ? onFechar() : setIndice(i => i + 1));
  const voltar = () => setIndice(i => Math.max(0, i - 1));

  // Rola o alvo para o centro antes de medir
  useEffect(() => {
    if (!atual?.alvo) return;
    document.querySelector(atual.alvo)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [atual]);

  // Posiciona holofote e card direto no DOM (sem estado) para não disparar
  // re-render a cada scroll/resize.
  useLayoutEffect(() => {
    const posicionar = () => {
      const anel = anelRef.current;
      const card = cardRef.current;
      if (!card) return;

      const el = atual?.alvo ? document.querySelector(atual.alvo) : null;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (!el || !anel) {
        // Passo sem alvo: card centralizado
        card.style.top = `${Math.max(16, (vh - card.offsetHeight) / 2)}px`;
        card.style.left = `${Math.max(16, (vw - card.offsetWidth) / 2)}px`;
        return;
      }

      const r = el.getBoundingClientRect();
      const topo = Math.max(8, r.top - MARGEM);
      const esq = Math.max(8, r.left - MARGEM);
      const larg = Math.min(vw - 16, r.width + MARGEM * 2);
      const alt = Math.min(vh - 16, r.height + MARGEM * 2);

      anel.style.top = `${topo}px`;
      anel.style.left = `${esq}px`;
      anel.style.width = `${larg}px`;
      anel.style.height = `${alt}px`;

      const por = (ref, t, e, w, h) => {
        const n = ref.current;
        if (!n) return;
        n.style.top = `${t}px`;
        n.style.left = `${e}px`;
        n.style.width = `${Math.max(0, w)}px`;
        n.style.height = `${Math.max(0, h)}px`;
      };
      por(faixaTopo, 0, 0, vw, topo);
      por(faixaBaixo, topo + alt, 0, vw, vh - (topo + alt));
      por(faixaEsq, topo, 0, esq, alt);
      por(faixaDir, topo, esq + larg, vw - (esq + larg), alt);

      // Card abaixo do alvo quando couber; senão acima; senão centralizado
      const altCard = card.offsetHeight;
      const abaixo = topo + alt + 12;
      const acima = topo - altCard - 12;
      card.style.top = `${abaixo + altCard < vh - 8 ? abaixo : acima > 8 ? acima : Math.max(8, (vh - altCard) / 2)}px`;

      const largCard = card.offsetWidth;
      const alvoCentro = esq + larg / 2 - largCard / 2;
      card.style.left = `${Math.min(Math.max(8, alvoCentro), vw - largCard - 8)}px`;
    };

    posicionar();
    const id = setTimeout(posicionar, 350); // depois do scroll suave
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
    };
  }, [atual]);

  if (!atual) return null;

  const temAlvo = !!atual.alvo && !!document.querySelector(atual.alvo);

  const botao = {
    minHeight: 44,
    padding: '10px 18px',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  return createPortal(
    <>
      {temAlvo ? (
        <>
          <div ref={faixaTopo} onClick={avancar} style={ESTILO_FAIXA} />
          <div ref={faixaBaixo} onClick={avancar} style={ESTILO_FAIXA} />
          <div ref={faixaEsq} onClick={avancar} style={ESTILO_FAIXA} />
          <div ref={faixaDir} onClick={avancar} style={ESTILO_FAIXA} />
          <div
            ref={anelRef}
            onClick={avancar}
            style={{
              // Sem transição: as faixas escuras também não têm, e animar só
              // o anel o descolaria do furo durante o movimento (além de
              // travar na posição antiga se a animação for suspensa).
              position: 'fixed', zIndex: 5001, borderRadius: 16, cursor: 'pointer',
              border: '3px solid var(--md-sys-color-primary)',
            }}
          />
        </>
      ) : (
        // Passo sem alvo: escurece a tela inteira
        <div
          onClick={avancar}
          style={{
            position: 'fixed', inset: 0, zIndex: 5000,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          }}
        />
      )}

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Guia do aplicativo"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'fixed', zIndex: 5002,
          width: `min(${LARGURA_CARD}px, calc(100vw - 16px))`,
          backgroundColor: 'var(--md-sys-color-surface)',
          color: 'var(--md-sys-color-on-surface)',
          borderRadius: 'var(--md-sys-shape-corner-large)',
          boxShadow: 'var(--md-sys-elevation-3)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{atual.icone}</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--md-sys-color-primary)' }}>{atual.titulo}</h2>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--md-sys-color-on-surface-variant)' }}>
              PASSO {indice + 1} DE {passos.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar guia"
            className="topbar-icon-btn"
            style={{ flexShrink: 0, color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: '0.88rem', lineHeight: 1.5, color: 'var(--md-sys-color-on-surface-variant)' }}>
          {atual.texto}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {passos.map((p, i) => (
              <span
                key={p.titulo}
                style={{
                  width: i === indice ? 16 : 6, height: 6, borderRadius: 3,
                  backgroundColor: i === indice ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)',
                  transition: 'width 0.2s',
                }}
              />
            ))}
          </div>
          {indice > 0 && (
            <button
              type="button"
              onClick={voltar}
              style={{ ...botao, border: '1px solid var(--md-sys-color-outline)', background: 'transparent', color: 'var(--md-sys-color-on-surface)' }}
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={avancar}
            style={{ ...botao, border: 'none', backgroundColor: 'var(--md-sys-color-primary)', color: '#fff' }}
          >
            {ultimo ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
