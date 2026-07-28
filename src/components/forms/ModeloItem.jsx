import { useState, useEffect, useMemo, useCallback } from 'react';
import { FilledCard } from '../ui/MdCard';
import './ModeloItem.css';

function ControleTipo({ tipo, opcoes, valor, onChange, nomeRadio, onStepperClick, isEditing, onFocusItem, onBlurItem, onNextItem }) {
  const [erroNegativo, setErroNegativo] = useState(false);

  const partesTipo = tipo.split(';').map(s => s.trim());

  // Efeito de piscar vermelho
  useEffect(() => {
    if (erroNegativo) {
      const timer = setTimeout(() => setErroNegativo(false), 300);
      return () => clearTimeout(timer);
    }
  }, [erroNegativo]);

  const handleValidChange = (novoValor) => {
    const temNegativo = Object.values(novoValor).some(v => v < 0);
    if (temNegativo) {
      setErroNegativo(true);
      // Corrige para 0 valores negativos
      const corrigido = {};
      Object.entries(novoValor).forEach(([k, v]) => { corrigido[k] = v < 0 ? 0 : v; });
      onChange(corrigido);
    } else {
      onChange(novoValor);
    }
  };

  /* Bool */
  if (partesTipo.includes('Bool') && opcoes.length >= 2) {
    const ativo = valor[opcoes[0]] > 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{ativo ? opcoes[0] : opcoes[1]}</span>
        <button
          type="button"
          onClick={() => {
            const novo = { ...valor };
            if (ativo) { novo[opcoes[0]] = 0; novo[opcoes[1]] = 1; }
            else { novo[opcoes[0]] = 1; novo[opcoes[1]] = 0; }
            handleValidChange(novo);
          }}
          className={`toggle-switch ${ativo ? 'active' : ''}`}
          role="switch" aria-checked={ativo}
        ><span className="toggle-thumb" /></button>
      </div>
    );
  }

  /* Medida */
  if (partesTipo.includes('Medida')) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {opcoes.map(op => (
          <div key={op} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{op}</span>
            <input
              type="number" inputMode="numeric" min="0" step="any"
              value={valor[op] || ''}
              onFocus={onFocusItem} onBlur={onBlurItem}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onNextItem?.(); } }}
              className={`stepper-input ${erroNegativo ? 'erro-negativo' : ''}`}
              onChange={(e) => {
                let v = parseFloat(e.target.value);
                const novo = { ...valor, [op]: v };
                handleValidChange(novo);
              }}
              style={{
                width: 80, padding: '4px 8px', borderRadius: 8,
                border: `1px solid ${erroNegativo ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'}`,
                textAlign: 'center', transition: 'border-color 0.2s',
              }}
              placeholder="0.0"
            />
          </div>
        ))}
      </div>
    );
  }

  /* Selecionar (radio) */
  if (partesTipo.includes('Selecionar') && !partesTipo.includes('Mult')) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {opcoes.map(op => (
          <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="radio" name={nomeRadio || `radio-${opcoes.join('-')}`} checked={valor[op] > 0}
              onChange={() => { const novo = {}; opcoes.forEach(o => (novo[o] = 0)); novo[op] = 1; handleValidChange(novo); }}
              style={{ accentColor: 'var(--md-sys-color-primary)' }} />
            <span style={{ fontSize: '0.85rem' }}>{op}</span>
          </label>
        ))}
      </div>
    );
  }

  /* Combinado (Selecionar + Mult) */
  if (partesTipo.includes('Selecionar') && partesTipo.includes('Mult')) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {opcoes.map(op => (
          <div key={op} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 16, padding: '2px 12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={valor[op] > 0}
                onChange={() => { const novo = { ...valor }; novo[op] = novo[op] > 0 ? 0 : 1; handleValidChange(novo); }}
                style={{ accentColor: 'var(--md-sys-color-primary)' }} />
              <span style={{ fontSize: '0.8rem' }}>{op}</span>
            </label>
            {valor[op] > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button type="button" className="stepper-btn" onClick={() => { onStepperClick?.(); const novo = { ...valor, [op]: Math.max(0, (valor[op] || 0) - 1) }; handleValidChange(novo); }}>−</button>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={valor[op] || ''}
                  onFocus={onFocusItem} onBlur={onBlurItem}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onNextItem?.(); } }}
                  className={`stepper-input ${erroNegativo ? 'erro-negativo' : ''}`}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    const novo = { ...valor, [op]: isNaN(v) ? 0 : v };
                    handleValidChange(novo);
                  }}
                  style={{ width: 30, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', border: 'none', background: 'transparent', outline: 'none', MozAppearance: 'textfield' }}
                />
                <button type="button" className="stepper-btn" onClick={() => { onStepperClick?.(); const novo = { ...valor, [op]: (valor[op] || 0) + 1 }; handleValidChange(novo); }}>+</button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  /* Fallback: Mult (steppers) */
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opcoes.map(op => (
        <div key={op} style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 16, padding: '2px 12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{op}</span>
          <button type="button" className="stepper-btn" onClick={() => { onStepperClick?.(); const novo = { ...valor, [op]: Math.max(0, (valor[op] || 0) - 1) }; handleValidChange(novo); }}>−</button>
          <input
            type="number" inputMode="numeric" min="0"
            value={valor[op] || ''}
            onFocus={onFocusItem} onBlur={onBlurItem}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onNextItem?.(); } }}
            className={`stepper-input ${erroNegativo ? 'erro-negativo' : ''}`}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              const novo = { ...valor, [op]: isNaN(v) ? 0 : v };
              handleValidChange(novo);
            }}
            style={{
              width: 40, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem',
              border: 'none', background: 'transparent', outline: 'none', MozAppearance: 'textfield',
            }}
          />
          <button type="button" className="stepper-btn" onClick={() => { onStepperClick?.(); const novo = { ...valor, [op]: (valor[op] || 0) + 1 }; handleValidChange(novo); }}>+</button>
        </div>
      ))}
    </div>
  );
}

// Adicionada prop fotosCount e garantida a desestruturação de onRemoveFoto
export default function ModeloItem({
  item,
  onChange,
  initialResposta,
  onTirarFoto,
  onCopiarResposta,
  onItemComplete,
  onStepperClick,
  isEditing,
  onFocusItem,
  onBlurItem,
  onNextItem,
  ultimaFoto,
  onViewFoto,
  onRemoveFoto, // agora recebida corretamente
  fotosCount = 0, // novo: contagem de fotos para este item
  ...rest
}) {
  const {
    cr4a1_item, cr4a1_descricao, cr4a1_var_quant,
    cr4a1_referencia: refOpcoesStr, cr4a1_tipolinha, cr4a1_tiporeferencia, cr4a1_tipo,
  } = item;

  const opcoesItem = cr4a1_var_quant ? cr4a1_var_quant.split(';').map(s => s.trim()).filter(Boolean) : [];
  const tipoItem = cr4a1_tipolinha ? cr4a1_tipolinha.trim() : '';
  const opcoesRef = refOpcoesStr ? refOpcoesStr.split(';').map(s => s.trim()).filter(Boolean) : [];
  const tipoRef = cr4a1_tiporeferencia ? cr4a1_tiporeferencia.trim() : '';

  const [valorItem, setValorItem] = useState(() => {
    if (initialResposta?.quantidades) return initialResposta.quantidades;
    const init = {};
    opcoesItem.forEach(op => (init[op] = 0));
    return init;
  });
  const [valorRef, setValorRef] = useState(() => {
    if (initialResposta?.referencia) return initialResposta.referencia;
    const init = {};
    opcoesRef.forEach(op => (init[op] = 0));
    return init;
  });
  const [observacao, setObservacao] = useState(initialResposta?.observacao || '');
  const [previousValorItem, setPreviousValorItem] = useState(null);
  const [wasComplete, setWasComplete] = useState(false);

  useEffect(() => {
    if (initialResposta) {
      setValorItem(initialResposta.quantidades || {});
      setValorRef(initialResposta.referencia || {});
      setObservacao(initialResposta.observacao || '');
    }
  }, [initialResposta]);

  const propagar = useCallback((itemVal, refVal, obs) => {
    onChange({
      item_id: cr4a1_item,
      descricao: cr4a1_descricao,
      observacao: obs !== undefined ? obs : observacao,
      quantidades: itemVal || valorItem,
      referencia: refVal || valorRef,
      tipo: cr4a1_tipo,
    });
  }, [onChange, cr4a1_item, cr4a1_descricao, observacao, valorItem, valorRef, cr4a1_tipo]);

  const handleItemChange = (novoValor) => {
    setPreviousValorItem({ ...valorItem });
    setValorItem(novoValor);
    propagar(novoValor, undefined, undefined);
  };

  const handleRefChange = (novoValor) => {
    setValorRef(novoValor);
    propagar(undefined, novoValor, undefined);
  };

  const handleUndo = () => {
    if (previousValorItem) {
      setValorItem(previousValorItem);
      propagar(previousValorItem, undefined, undefined);
      setPreviousValorItem(null);
    }
  };

  const itemCompleto = useMemo(() => {
    const temQuantidade = Object.values(valorItem).some(v => v > 0);
    const refExistente = opcoesRef.length > 0;
    const temReferencia = refExistente ? Object.values(valorRef).some(v => v > 0) : true;
    return temQuantidade && temReferencia;
  }, [valorItem, valorRef, opcoesRef]);

  useEffect(() => {
    if (itemCompleto && !wasComplete && onItemComplete) {
      onItemComplete(cr4a1_item);
    }
    setWasComplete(itemCompleto);
  }, [itemCompleto]);

  const podeDesfazer = previousValorItem !== null;

  return (
    <FilledCard
      className={`card-interactive ${itemCompleto ? 'completo' : ''}`}
      style={{
        marginBottom: 12, padding: 16, backgroundColor: 'var(--md-sys-color-surface)',
        transition: 'border-color 0.2s', overflow: 'hidden', wordBreak: 'break-word', overflowY: 'hidden',
        boxShadow: isEditing ? '0 0 0 2px var(--md-sys-color-primary)' : 'none',
      }}
      data-item-index={rest['data-item-index']}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          <h4 style={{
            margin: '0 0 2px', color: 'var(--md-sys-color-on-surface)', fontSize: '0.95rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {cr4a1_descricao}
          </h4>
          {isEditing && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--md-sys-color-primary)', flexShrink: 0 }} />
          )}
        </div>
        {itemCompleto && (
          <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)', fontSize: 20, marginLeft: 8 }}>
            check_circle
          </span>
        )}
      </div>

      {opcoesItem.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <ControleTipo
            tipo={tipoItem} opcoes={opcoesItem} valor={valorItem} onChange={handleItemChange}
            onStepperClick={onStepperClick} isEditing={isEditing} onFocusItem={onFocusItem}
            onBlurItem={onBlurItem} onNextItem={onNextItem}
          />
        </div>
      )}

      {opcoesRef.length > 0 && (
        <div style={{ marginTop: 8, padding: 12, backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 12, border: '1px dashed var(--md-sys-color-outline)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>Referência</p>
          <ControleTipo
            tipo={tipoRef} opcoes={opcoesRef} valor={valorRef} onChange={handleRefChange}
            nomeRadio={`ref-radio-${cr4a1_item}`}
          />
        </div>
      )}

      <md-filled-text-field
        label="Observação" value={observacao}
        onInput={(e) => { setObservacao(e.target.value); propagar(undefined, undefined, e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onNextItem?.(); } }}
        style={{ width: '100%', marginTop: 12 }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {/* Miniatura da última foto */}
        {ultimaFoto && (
          <div style={{ position: 'relative', marginRight: 'auto', cursor: 'pointer' }} onClick={() => onViewFoto?.(ultimaFoto.thumbnail)}>
            <img src={ultimaFoto.thumbnail} alt="Última foto" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--md-sys-color-outline)' }} />
            {onRemoveFoto && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveFoto(); }}
                style={{
                  position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: 'var(--md-sys-color-error)', color: '#fff', border: 'none',
                  fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {onCopiarResposta && (
          <button type="button" onClick={() => onCopiarResposta(cr4a1_item)} style={{ background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--md-sys-color-primary)', fontSize: '0.8rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span> Copiar
          </button>
        )}
        {podeDesfazer && (
          <button type="button" onClick={handleUndo} style={{ background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--md-sys-color-primary)', fontSize: '0.8rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>undo</span> Desfazer
          </button>
        )}
        {onTirarFoto && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onTirarFoto(cr4a1_item); }} style={{ background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--md-sys-color-primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>photo_camera</span> Fotos ({fotosCount})
          </button>
        )}
      </div>
    </FilledCard>
  );
}