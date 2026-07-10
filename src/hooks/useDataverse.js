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
    const data = await callApi(`/${entitySet}?${filter}`);
    return data?.value || [];
  };

  const getListaOS = async () => {
    const cabSet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const data = await callApi(`/${cabSet}?$select=cr4a1_os`);
    if (!data?.value) return [];
    const osList = [...new Set(data.value.map(item => item.cr4a1_os))];
    return osList;
  };

  const upsertItemResposta = async (os, itemId, quantString, observacao) => {
    const entitySet = await resolveEntitySet('cr4a1_peritagem_b04');
    const filter = `$filter=cr4a1_os eq '${encodeURIComponent(os)}' and cr4a1_item eq '${encodeURIComponent(itemId)}'`;
    const existente = await callApi(`/${entitySet}?${filter}`);
    const registro = existente?.value?.[0];

    const payload = {
      cr4a1_os: os,
      cr4a1_item: itemId,
      cr4a1_observacao: observacao || '',
      cr4a1_var_quant: quantString,
    };

    if (registro) {
      const idField = `${entitySet}id`;
      await callApi(`/${entitySet}(${registro[idField]})`, 'PATCH', payload);
    } else {
      await callApi(`/${entitySet}`, 'POST', payload);
    }
  };

  const salvarTipo = async (os, respostasTipo) => {
    for (const resposta of respostasTipo) {
      const quantString = Object.entries(resposta.quantidades)
        .map(([op, qty]) => `${op}:${qty}`)
        .join(';');
      await upsertItemResposta(os, resposta.item_id, quantString, resposta.observacao);
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
    const token = user?.token;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/fotos?os=${encodeURIComponent(os)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Erro ao carregar fotos');
    return res.json();
  };

  return {
    sendInspecao,
    getUsuarios,
    getUsuarioLogado,
    getModeloItens,
    getInspecoes,
    createCabecalho,
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
  };
}