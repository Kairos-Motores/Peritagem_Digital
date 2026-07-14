import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataverse } from '../hooks/useDataverse';
import { useInspecao } from '../contexts/InspecaoContext';
import TopBar from '../components/navigation/TopBar';
import { FilledButton } from '../components/ui/MdButton';
import { ElevatedCard } from '../components/ui/MdCard';
import LoadingScreen from '../components/ui/LoadingScreen';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import AlbumFotos from '../components/forms/AlbumFotos';

export default function InspecaoDetalhe() {
  const { os } = useParams();
  const navigate = useNavigate();
  const { getCabecalhoByOS, getItensByOS, getFilialPeritador, getFotos } = useDataverse();
  const { retomarInspecao } = useInspecao();
  const { error: toastError, success } = useToast();
  const [cabecalho, setCabecalho] = useState(null);
  const [itens, setItens] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFoto, setSelectedFoto] = useState(null);
  const [readonly, setReadonly] = useState(false);

  const username = sessionStorage.getItem('dv_username');
  const userToken = sessionStorage.getItem('dv_token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cab, its, fts] = await Promise.all([
          getCabecalhoByOS(os),
          getItensByOS(os),
          getFotos(os),
        ]);
        if (cab) {
          const filialPeritador = await getFilialPeritador(username);
          if (cab.cr4a1_filial && filialPeritador && cab.cr4a1_filial !== filialPeritador) {
            toastError('Você não tem permissão para visualizar esta peritagem.');
            navigate('/home');
            return;
          }
          setReadonly(cab.cr4a1_status === 'Concluída');
        }
        setCabecalho(cab);
        setItens(its);
        setFotos(fts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [os]);

  const handleUploadFoto = async (base64, fileName, numero) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/upload-foto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({ os, fotoBase64: base64, nomeArquivo: fileName }),
    });
    if (!res.ok) throw new Error('Upload falhou');
    const data = await res.json();
    setFotos(prev => {
      const outras = prev.filter(f => !f.name.match(new RegExp(`_foto_${numero}\\.jpg$`)));
      return [...outras, { name: fileName, url: data.url, id: data.id }];
    });
    success('Foto salva com sucesso!');
  };

  const handleViewFoto = (foto) => {
    setSelectedFoto(foto);
  };

  const closeFoto = () => setSelectedFoto(null);

  const handleUpdateFotos = async () => {
    try {
      const fts = await getFotos(os);
      setFotos(fts || []);
    } catch (err) {
      console.error('Erro ao recarregar fotos:', err);
    }
  };

  if (loading) return <LoadingScreen message="Carregando detalhes" />;

  const renderField = (label, value) =>
    value ? (
      <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginRight: 8, minWidth: 130 }}>
          {label}:
        </span>
        <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{value}</span>
      </div>
    ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--md-sys-color-surface)' }}>
      <TopBar title={`OS: ${os}`} />
      <div className="page-content" style={{ paddingBottom: 24 }}>
        {cabecalho && (
          <ElevatedCard style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: 'var(--md-sys-color-on-surface)' }}>Dados da Peritagem</h2>
              {cabecalho.cr4a1_status && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 16,
                    backgroundColor:
                      cabecalho.cr4a1_status === 'Concluída'
                        ? 'var(--md-sys-color-primary)'
                        : 'var(--md-sys-color-surface-variant)',
                    color:
                      cabecalho.cr4a1_status === 'Concluída'
                        ? '#fff'
                        : 'var(--md-sys-color-on-surface-variant)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {cabecalho.cr4a1_status}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginBottom: 20 }}>
              {renderField('Cliente', cabecalho.cr4a1_cliente)}
              {renderField('Área', cabecalho.cr4a1_area)}
              {renderField('Nº Série', cabecalho.cr4a1_n_serie)}
              {renderField('OS Retorno', cabecalho.cr4a1_os_retorno)}
              {renderField('Tensão', cabecalho.cr4a1_tensao)}
              {renderField('Corrente', cabecalho.cr4a1_corrente)}
              {renderField('Modelo', cabecalho.cr4a1_modelo)}
              {renderField('Fabricante', cabecalho.cr4a1_fabricante)}
              {renderField('Carcaça', cabecalho.cr4a1_carcaca)}
              {renderField('Potência (CV)', cabecalho.cr4a1_potencia_cv)}
              {renderField('Potência (kW)', cabecalho.cr4a1_potencia_kw)}
              {renderField('Tag Cliente', cabecalho.cr4a1_tag_cliente)}
              {renderField('RPM', cabecalho.cr4a1_rpm)}
              {renderField('Polos', cabecalho.cr4a1_polos)}
              {renderField('Classe', cabecalho.cr4a1_classe)}
              {renderField('FS', cabecalho.cr4a1_fs)}
              {renderField('IP', cabecalho.cr4a1_ip)}
              {renderField('CAT', cabecalho.cr4a1_cat)}
              {renderField('REG', cabecalho.cr4a1_reg)}
              {renderField('FC', cabecalho.cr4a1_fc)}
              {renderField('Frequência', cabecalho.cr4a1_frequencia)}
              {renderField('Peso', cabecalho.cr4a1_peso)}
              {renderField('Nº REQ', cabecalho.cr4a1_n_req)}
              {renderField('Tag Kairós', cabecalho.cr4a1_tag_kairos)}
              {renderField('Comprimento', cabecalho.cr4a1_comprimento)}
              {renderField('Largura', cabecalho.cr4a1_largura)}
              {renderField('Altura', cabecalho.cr4a1_altura)}
              {renderField('ME', cabecalho.cr4a1_me)}
              {renderField('Peritador', cabecalho.cr4a1_peritador)}
              {renderField('Mecânico', cabecalho.cr4a1_mecanico)}
              {renderField(
                'Data Início',
                cabecalho.cr4a1_data_peritagem
                  ? new Date(cabecalho.cr4a1_data_peritagem).toLocaleString()
                  : null
              )}
              {renderField(
                'Data Fim',
                cabecalho.cr4a1_data_peritagem_fim
                  ? new Date(cabecalho.cr4a1_data_peritagem_fim).toLocaleString()
                  : null
              )}
            </div>

            {cabecalho.cr4a1_status === 'Em andamento' && (
              <FilledButton
                onClick={() => {
                  const cabecalhoId = cabecalho.cr4a1_peritagem_cabecalhoid;
                  retomarInspecao(os, cabecalhoId);
                  navigate('/checklist');
                }}
                style={{ width: '100%', marginTop: 8 }}
              >
                Continuar Inspeção
              </FilledButton>
            )}
          </ElevatedCard>
        )}

        {/* Álbum de fotos */}
        <AlbumFotos
          os={os}
          fotosDefinitivas={fotos}
          filial={cabecalho?.cr4a1_filial || 'SemFilial'}
          cliente={cabecalho?.cr4a1_cliente || 'SemCliente'}
          readonly={readonly}
          onUpdate={handleUpdateFotos}
        />

        {/* Itens da Inspeção */}
        <h2 style={{ color: 'var(--md-sys-color-on-surface)', marginTop: 24, marginBottom: 12 }}>
          Itens Avaliados
        </h2>
        {itens.length === 0 && (
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nenhum item registrado.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {itens.map(item => {
            const quantStr = item.cr4a1_var_quant || '';
            const quantPairs = quantStr.split(';').filter(Boolean).map(p => {
              const [op, qty] = p.split(':');
              return { opcao: op, quantidade: qty };
            });
            return (
              <ElevatedCard key={item.cr4a1_peritagem_b04id} style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: 8 }}>
                  {item.cr4a1_descricao || item.cr4a1_item || 'Item sem nome'}
                </div>
                {item.cr4a1_observacao && (
                  <p style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)' }}>
                    Obs: {item.cr4a1_observacao}
                  </p>
                )}
                {quantPairs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {quantPairs.map((p, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: 'var(--md-sys-color-surface-variant)',
                          color: 'var(--md-sys-color-on-surface-variant)',
                          padding: '2px 10px',
                          borderRadius: 16,
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                      >
                        {p.opcao}: {p.quantidade}
                      </span>
                    ))}
                  </div>
                )}
              </ElevatedCard>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedFoto && (
          <motion.div
            className="modal-overlay"
            onClick={closeFoto}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            >
              <button
                onClick={closeFoto}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  padding: 8,
                }}
              >
                ✕
              </button>
              <img
                src={selectedFoto.url}
                alt={selectedFoto.name}
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}