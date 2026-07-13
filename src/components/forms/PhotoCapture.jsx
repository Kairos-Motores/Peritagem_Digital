import { useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import './PhotoCapture.css';

export default function PhotoCapture({ os, itensModelo, fotosExistentes = [], onCapture }) {
  const fileRef = useRef();
  const [enviando, setEnviando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState('');
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState('');
  const { success, error } = useToast();

  // Obtém a descrição do item selecionado
  const itemDescricao = itensModelo.find(i => i.cr4a1_item === itemSelecionado)?.cr4a1_descricao || '';

  const chaveJaExiste = (num) => {
    const sufixo = `_${num}.jpg`;
    return fotosExistentes.some(foto => foto.name.endsWith(sufixo));
  };

  const chaveValida = /^[1-9]$|^1[0-8]$/.test(chave) && !chaveJaExiste(chave);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!itemSelecionado) {
      setErro('Selecione um item.');
      return;
    }
    if (!chaveValida) {
      setErro('Escolha uma chave válida e não repetida.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setEnviando(true);
      try {
        // Sanitiza a descrição para nome de arquivo
        const descSanitizada = itemDescricao
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_\-]/g, '')
          .substring(0, 30); // limite para não ficar gigante
        const guid = crypto.randomUUID().slice(0, 6);
        const nomeArquivo = `${os}_${descSanitizada}_${guid}_${chave}.jpg`;

        if (onCapture) await onCapture(base64, nomeArquivo);
        success('Foto enviada!');
        setChave('');
        setErro('');
        // Recarrega a lista de fotos para atualizar duplicidade
      } catch (err) {
        error('Erro ao enviar foto.');
      } finally {
        setEnviando(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        {/* Seletor de item */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Item</label>
          <select
            value={itemSelecionado}
            onChange={(e) => setItemSelecionado(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--md-sys-color-outline)',
              fontSize: '0.9rem',
              width: '100%',
            }}
          >
            <option value="">Selecione...</option>
            {itensModelo.map(item => (
              <option key={item.cr4a1_item} value={item.cr4a1_item}>
                {item.cr4a1_descricao}
              </option>
            ))}
          </select>
        </div>

        {/* Chave */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Chave (1-18)</label>
          <input
            type="number"
            min="1"
            max="18"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${erro && !chaveValida ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'}`,
              fontSize: '1rem',
              textAlign: 'center',
              width: '100%',
            }}
          />
        </div>

        {/* Botão câmera */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={enviando || !chaveValida || !itemSelecionado}
          className="photo-btn"
          aria-label="Tirar foto"
          style={{ alignSelf: 'center' }}
        >
          <span className="material-symbols-outlined">photo_camera</span>
        </button>
      </div>

      {erro && <span style={{ color: 'var(--md-sys-color-error)', fontSize: '0.8rem' }}>{erro}</span>}
      {!itemSelecionado && <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem' }}>Selecione o item relacionado à foto.</span>}
      {!chaveValida && chave && (
        <span style={{ color: 'var(--md-sys-color-error)', fontSize: '0.8rem' }}>
          {chaveJaExiste(chave) ? 'Chave já usada.' : 'Chave deve ser entre 1 e 18.'}
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}