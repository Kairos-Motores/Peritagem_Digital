import { useAuth } from './useAuth';

const entitySetCache = {};

export function useDataverse() {
  const { user } = useAuth();

  const callApi = async (path, method = 'GET', body = null) => {
    if (!user?.token) throw new Error('Não autenticado');

    const res = await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, path, body }),
    });

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      if (!res.ok) {
        throw new Error(`Erro ${res.status}: resposta não é JSON`);
      }
      return undefined;
    }

    if (!res.ok) {
      let errorMessage = `Erro: ${res.status}`;
      if (data?.error?.message) {
        errorMessage = data.error.message;
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        errorMessage = JSON.stringify(data);
      }
      throw new Error(errorMessage);
    }

    return data;
  };

  const resolveEntitySet = async (logicalName) => {
    if (entitySetCache[logicalName]) return entitySetCache[logicalName];
    const res = await fetch(`${import.meta.env.VITE_API_URL}/entityset?logicalName=${encodeURIComponent(logicalName)}`);
    if (!res.ok) throw new Error(`Não foi possível resolver entity set para ${logicalName}`);
    const data = await res.json();
    entitySetCache[logicalName] = data.entitySetName;
    return data.entitySetName;
  };

  const getUsuarioLogado = async (username) => {
    const entitySet = await resolveEntitySet('cr4a1_credenciais');
    const filter = `$filter=cr4a1_usu_x00e1_rio eq '${encodeURIComponent(username)}'`;
    const data = await callApi(`/${entitySet}?${filter}`);
    return data?.value?.[0] || null;
  };

  const getUsuarios = async () => {
    const entitySet = await resolveEntitySet('cr4a1_credenciais');
    const select = `$select=cr4a1_credenciaisid,cr4a1_usu_x00e1_rio,cr4a1_title`;
    return callApi(`/${entitySet}?${select}`);
  };

  const getModeloItens = async () => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_b01');
    const data = await callApi(`/${entitySet}`);
    return data?.value || [];
  };

  // Obtém a filial do peritador logado
  const getFilialPeritador = async (username) => {
    const userData = await getUsuarioLogado(username);
    return userData?.cr4a1_filial || null;
  };

  // Retorna cabeçalhos apenas da filial fornecida
  const getCabecalhosPorFilial = async (filial) => {
    if (!filial) return [];
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const filter = `$filter=cr4a1_filial eq '${encodeURIComponent(filial)}'`;
    const select = `$select=cr4a1_os,cr4a1_peritador,cr4a1_status,cr4a1_tem_fotos`;
    const data = await callApi(`/${entitySet}?${filter}&${select}`);
    return data?.value || [];
  };

  const createCabecalho = async (dados) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');

    // Monta o payload com data de início automática e status inicial
    const payload = {
      ...dados,
      cr4a1_data_peritagem: new Date().toISOString(),
      cr4a1_status: 'Em andamento',
    };
    // Remove campo de data final se ainda existir (proteção)
    delete payload.cr4a1_data_peritagem_fim;

    console.log('📤 Enviando cabeçalho:', payload); // LOG TEMPORÁRIO

    // Envio via callApi (já usa o proxy corretamente)
    await callApi(`/${entitySet}`, 'POST', payload);

    // Busca o registro pela OS para obter o ID
    const filter = `$filter=cr4a1_os eq '${encodeURIComponent(dados.cr4a1_os)}'`;
    const search = await callApi(`/${entitySet}?${filter}`);
    const idField = `${entitySet}id`;
    return search?.value?.[0]?.[idField];
  };

  // Busca o cabeçalho mais recente com o mesmo modelo (e fabricante, se
  // informado) pra preencher automaticamente os dados técnicos de um motor
  // já peritado antes — usado pelo botão opcional "Buscar dados técnicos".
  const getUltimoCabecalhoPorModelo = async (modelo, fabricante) => {
    if (!modelo) return null;
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const escapar = (v) => v.replace(/'/g, "''");
    const filtros = [`cr4a1_modelo eq '${encodeURIComponent(escapar(modelo))}'`];
    if (fabricante) filtros.push(`cr4a1_fabricante eq '${encodeURIComponent(escapar(fabricante))}'`);
    const query = `$filter=${filtros.join(' and ')}&$orderby=cr4a1_data_peritagem desc&$top=1`;
    const data = await callApi(`/${entitySet}?${query}`);
    return data?.value?.[0] || null;
  };

  const updateCabecalho = async (cabecalhoId, dados) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    await callApi(`/${entitySet}(${cabecalhoId})`, 'PATCH', dados);
  };

  const updateCabecalhoFinal = async (cabecalhoId) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const payload = {
      cr4a1_data_peritagem_fim: new Date().toISOString(),
    };
    await callApi(`/${entitySet}(${cabecalhoId})`, 'PATCH', payload);
  };

  const sendInspecao = async (inspecao) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_b04');
    for (const resposta of inspecao.respostas) {
      const quantString = Object.entries(resposta.quantidades)
        .map(([op, qty]) => `${op}:${qty}`)
        .join(';');
      const payload = {
        'cr4a1_os': inspecao.os,
        'cr4a1_item': resposta.item_id,
        'cr4a1_observacao': resposta.observacao,
        'cr4a1_var_quant': quantString,
      };
      await callApi(`/${entitySet}`, 'POST', payload);
    }
    return { success: true };
  };

  const getInspecoes = async () => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_b04');
    const data = await callApi(`/${entitySet}`);
    return data?.value || [];
  };

  const getCabecalhoByOS = async (os) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const filter = `$filter=cr4a1_os eq '${encodeURIComponent(os)}'`;
    const data = await callApi(`/${entitySet}?${filter}`);
    return data?.value?.[0] || null;
  };

  const getItensByOS = async (os) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_b04');
    const filter = `$filter=cr4a1_os eq '${encodeURIComponent(os)}'`;
    const select = `&$select=cr4a1_item,cr4a1_descricao,cr4a1_observacao,cr4a1_var_quant,cr4a1_referencia,cr4a1_tipo`;
    const data = await callApi(`/${entitySet}?${filter}${select}`);
    return data?.value || [];
  };

  const getListaOS = async () => {
    const cabSet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const data = await callApi(`/${cabSet}?$select=cr4a1_os`);
    if (!data?.value) return [];
    const osList = [...new Set(data.value.map(item => item.cr4a1_os))];
    return osList;
  };

  const upsertItemResposta = async (
    os,
    itemId,
    quantString,
    observacao,
    descricao,
    tipo,                // 6º parâmetro – o nome do tipo (ex: "Peça")
    peritador,           // 7º parâmetro – nome do peritador
    referenciaJson = ''  // 8º parâmetro – JSON da referência
  ) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_b04');
    const filter = `$filter=cr4a1_os eq '${encodeURIComponent(os)}' and cr4a1_item eq '${encodeURIComponent(itemId)}'`;
    const existente = await callApi(`/${entitySet}?${filter}`);
    const registro = existente?.value?.[0];

    const payload = {
      cr4a1_os: os,
      cr4a1_item: itemId,
      cr4a1_descricao: descricao || '',
      cr4a1_observacao: observacao || '',
      cr4a1_var_quant: quantString,
      cr4a1_tipo: tipo || '',
      cr4a1_peritador: peritador || '',
      cr4a1_referencia: referenciaJson || '',
    };

    if (registro) {
      const idField = Object.keys(registro).find(key => key.endsWith('id'));
      if (idField) {
        await callApi(`/${entitySet}(${registro[idField]})`, 'PATCH', payload);
      } else {
        throw new Error('Não foi possível encontrar o ID do registo');
      }
    } else {
      await callApi(`/${entitySet}`, 'POST', payload);
    }
  };

  const salvarTipo = async (os, respostasTipo) => {
    for (const resposta of respostasTipo) {
      const quantString = Object.entries(resposta.quantidades)
        .map(([op, qty]) => `${op}:${qty}`)
        .join(';');
      const referenciaJson = JSON.stringify(resposta.referencia || {});
      await upsertItemResposta(
        os,
        resposta.item_id,
        quantString,
        resposta.observacao,
        resposta.descricao,
        resposta.tipo,          // 6º → tipo
        resposta.peritador,     // 7º → peritador
        referenciaJson          // 8º → referência em JSON
      );
    }
  };

  const updateStatusCabecalho = async (cabecalhoId, status) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const payload = { cr4a1_status: status };
    const res = await fetch(`${import.meta.env.VITE_API_URL}/dataverse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user?.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'PATCH',
        path: `/${entitySet}(${cabecalhoId})`,
        body: payload,
        options: { atualizarDataFim: true },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erro ao atualizar status');
    }
  };

  const getCabecalhos = async () => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const data = await callApi(`/${entitySet}?$select=cr4a1_os,cr4a1_peritador,cr4a1_status`);
    return data?.value || [];
  };

  const getFotos = async (os) => {
    const token = sessionStorage.getItem('dv_token'); // ⚠️ token direto do sessionStorage
    if (!token) throw new Error('Token não disponível');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/fotos?os=${encodeURIComponent(os)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Erro ao carregar fotos (${res.status})`);
    return res.json();
  };

  const validarOS = async (os) => {
    const token = user?.token;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/validar-os?os=${encodeURIComponent(os)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erro ao validar OS');
    return res.json();
  };

  const getOSPendentes = async (filial) => {
    if (!filial) return [];

    const baseMedroSet = await resolveEntitySet('cr4a1_base_medro');
    const zb6Set = await resolveEntitySet('cr4a1_zb6_relatorio');

    // 1. Busca as OS da base_medro na filial, setor 'PCP' (máx. 50)
    const filterBase = `$filter=cr4a1_unidade eq '${encodeURIComponent(filial)}' and cr4a1_setor eq 'PCP'&$select=cr4a1_os_comp,cr4a1_cliente&$top=50`;
    const dataBase = await callApi(`/${baseMedroSet}?${filterBase}`);
    const osBase = dataBase?.value || [];

    if (osBase.length === 0) return [];

    // 2. Busca todas as OS da ZB6 que possuem data de entrada NULA
    const filterZb6 = `$filter=cr4a1_zb6_dtentr eq null&$select=cr4a1_novacoluna`;
    const dataZb6 = await callApi(`/${zb6Set}?${filterZb6}`);
    const zb6Codes = (dataZb6?.value || []).map(item => item.cr4a1_novacoluna);

    // 3. Retorna apenas as OS da base que estão na ZB6 com dtentr nula
    return osBase.filter(item => zb6Codes.includes(item.cr4a1_os_comp));
  };

  return {
    sendInspecao,
    getUsuarios,
    getUsuarioLogado,
    getModeloItens,
    getInspecoes,
    createCabecalho,
    updateCabecalho,
    getUltimoCabecalhoPorModelo,
    updateCabecalhoFinal,
    getCabecalhoByOS,
    getItensByOS,
    getListaOS,
    upsertItemResposta,
    salvarTipo,
    updateStatusCabecalho,
    getCabecalhos,
    getFilialPeritador,
    getCabecalhosPorFilial,
    getFotos,
    validarOS,
    getOSPendentes,
  };
}