import { useState, useEffect } from 'react';
import { FilledCard } from '../ui/MdCard';
import './ModeloItem.css';

export default function ModeloItem({ item, onChange, initialResposta, onTirarFoto }) {
  const { cr4a1_item, cr4a1_descricao, cr4a1_var_quant, cr4a1_referencia } = item;
  const opcoes = cr4a1_var_quant ? cr4a1_var_quant.split(';').map(s => s.trim()).filter(Boolean) : [];
  const isBinario = opcoes.length === 2;

  const [estado, setEstado] = useState(() => {
    if (initialResposta?.quantidades) return initialResposta.quantidades;
    const init = {};
    opcoes.forEach(op => (init[op] = 0));
    return init;
  });
  const [observacao, setObservacao] = useState(initialResposta?.observacao || '');

  useEffect(() => {
    if (initialResposta) {
      setEstado(initialResposta.quantidades);
      setObservacao(initialResposta.observacao);
    }
  }, [initialResposta]);

  const propagar = (novoEstado, novaObs) => {
    const est = novoEstado || estado;
    const obs = novaObs !== undefined ? novaObs : observacao;
    onChange({ item_id: cr4a1_item, descricao: cr4a1_descricao, observacao: obs, quantidades: est });
  };

  const toggleBinario = () => {
    const [op1, op2] = opcoes;
    const novo = estado[op1] > 0 ? { [op1]: 0, [op2]: 1 } : { [op1]: 1, [op2]: 0 };
    setEstado(novo);
    propagar(novo, undefined);
  };

  const increment = (op) => {
    const novo = { ...estado, [op]: (estado[op] || 0) + 1 };
    setEstado(novo);
    propagar(novo, undefined);
  };
  const decrement = (op) => {
    const novo = { ...estado, [op]: Math.max(0, (estado[op] || 0) - 1) };
    setEstado(novo);
    propagar(novo, undefined);
  };

  const opcaoAtiva = isBinario ? (estado[opcoes[0]] > 0 ? opcoes[0] : opcoes[1]) : null;

  return (
    <FilledCard className="card-interactive" style={{ marginBottom: 12, padding: 16, backgroundColor: 'var(--md-sys-color-surface)' }}>
      <h4 style={{ margin: '0 0 2px', color: 'var(--md-sys-color-on-surface)', fontSize: '0.95rem' }}>{cr4a1_descricao}</h4>
      {cr4a1_referencia && (
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
          Ref: {cr4a1_referencia}
        </p>
      )}

      {isBinario ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <span style={{ fontWeight: 500, color: 'var(--md-sys-color-on-surface)', minWidth: 80, fontSize: '0.9rem' }}>
            {opcaoAtiva}
          </span>
          <button
            type="button"
            onClick={toggleBinario}
            className={`toggle-switch ${estado[opcoes[0]] > 0 ? 'active' : ''}`}
            role="switch"
            aria-checked={estado[opcoes[0]] > 0}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {opcoes.map(op => (
            <div
              key={op}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                backgroundColor: 'var(--md-sys-color-surface-variant)',
                borderRadius: 20,
                padding: '2px 12px',
              }}
            >
              <span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface)' }}>
                {op}
              </span>
              <button type="button" onClick={() => decrement(op)} className="stepper-btn">−</button>
              <span style={{ width: 24, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                {estado[op] || 0}
              </span>
              <button type="button" onClick={() => increment(op)} className="stepper-btn">+</button>
            </div>
          ))}
        </div>
      )}

      <md-filled-text-field
        label="Observação"
        value={observacao}
        onInput={(e) => {
          setObservacao(e.target.value);
          propagar(undefined, e.target.value);
        }}
        style={{ width: '100%' }}
      />

      {onTirarFoto && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTirarFoto(cr4a1_item);
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--md-sys-color-outline)',
              borderRadius: 20,
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              color: 'var(--md-sys-color-primary)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>photo_camera</span>
            <span style={{ fontSize: '0.8rem' }}>Fotos</span>
          </button>
        </div>
      )}
    </FilledCard>
  );
}