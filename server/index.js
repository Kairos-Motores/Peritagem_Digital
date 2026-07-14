// server/index.js
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const entitySetCache = {};

const SHAREPOINT_SITE_ID = 'aplicativokm.sharepoint.com,471ed516-b1af-4b60-adb1-e33530b40fd2,64f58d5b-ed1a-40d5-9bb2-2b591721c859';

// ---------- FUNÇÕES AUXILIARES ----------

async function getGraphToken() {
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.DATAVERSE_CLIENT_ID,
    client_secret: process.env.DATAVERSE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    }
  );
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Falha ao obter token do Graph: ${errText}`);
  }
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function getAccessToken() {
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.DATAVERSE_CLIENT_ID,
    client_secret: process.env.DATAVERSE_CLIENT_SECRET,
    scope: `${process.env.DATAVERSE_ENV_URL}/.default`,
  });
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenBody }
  );
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Falha ao obter token: ${tokenRes.status} ${errText}`);
  }
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function resolveEntitySet(logicalName) {
  if (entitySetCache[logicalName]) return entitySetCache[logicalName];
  const token = await getAccessToken();
  const url = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2/EntityDefinitions?$filter=LogicalName eq '${logicalName}'&$select=EntitySetName`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const data = await resp.json();
  if (data.value?.length > 0) {
    const entitySetName = data.value[0].EntitySetName;
    entitySetCache[logicalName] = entitySetName;
    console.log(`✔ EntitySet de '${logicalName}': ${entitySetName}`);
    return entitySetName;
  }
  throw new Error(`Tabela ${logicalName} não encontrada`);
}

async function getDocTecnicosDrive(graphToken) {
  const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/drives`;
  const drivesRes = await fetch(drivesUrl, {
    headers: { Authorization: `Bearer ${graphToken}` },
  });
  if (!drivesRes.ok) throw new Error(`Falha ao listar drives: ${await drivesRes.text()}`);
  const drivesData = await drivesRes.json();
  const drive = drivesData.value.find(d => d.name === 'Doc Técnicos' || d.webUrl.includes('Doc%20Tcnicos'));
  if (!drive) throw new Error('Biblioteca "Doc Técnicos" não encontrada');
  return drive;
}

async function ensureFolderPath(graphToken, driveId, folderPath) {
  const parts = folderPath.split('/');
  let parentId = null;
  for (const part of parts) {
    const encoded = encodeURIComponent(part);
    const checkUrl = parentId
      ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}:/${encoded}:/`
      : `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encoded}:/`;
    const check = await fetch(checkUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (check.ok) {
      const item = await check.json();
      parentId = item.id;
    } else if (check.status === 404) {
      const createUrl = parentId
        ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`
        : `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
      const create = await fetch(createUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${graphToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: part, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
      });
      if (!create.ok) {
        const errText = await create.text();
        throw new Error(`Falha ao criar pasta '${part}': ${errText}`);
      }
      const created = await create.json();
      parentId = created.id;
    } else {
      throw new Error(`Erro ao verificar pasta '${part}': ${await check.text()}`);
    }
  }
  return parentId;
}

// ---------- ROTAS ----------

app.post('/api/login', async (req, res) => {
  const { username, matricula } = req.body;
  if (!username || !matricula) {
    return res.status(400).json({ message: 'Usuário e matrícula são obrigatórios' });
  }
  try {
    const entitySet = await resolveEntitySet('cr4a1_credenciais');
    const query = `/${entitySet}?$filter=cr4a1_usu_x00e1_rio eq '${encodeURIComponent(username)}' and cr4a1_matr_x00ed_cula eq '${encodeURIComponent(matricula)}'`;
    const apiUrl = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2${query}`;
    const credRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${await getAccessToken()}`, Accept: 'application/json' },
    });
    if (!credRes.ok) {
      const errText = await credRes.text();
      throw new Error(`Erro ao consultar credenciais: ${credRes.status} ${errText}`);
    }
    const data = await credRes.json();
    if (!data.value || data.value.length === 0) {
      return res.status(401).json({ message: 'Usuário ou matrícula inválidos' });
    }
    const sessionToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token: sessionToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/entityset', async (req, res) => {
  const logicalName = req.query.logicalName;
  if (!logicalName) return res.status(400).json({ message: 'Parâmetro logicalName é obrigatório' });
  try {
    const entitySetName = await resolveEntitySet(logicalName);
    res.json({ entitySetName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/dataverse', async (req, res) => {
  const { method, path, body, options } = req.body;
  if (!path) return res.status(400).json({ message: 'Caminho não informado' });
  try {
    const token = await getAccessToken();
    const dvUrl = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2${path}`;
    let requestBody = body;
    if (options?.atualizarDataInicio && method === 'POST') {
      requestBody = { ...body, cr4a1_data_peritagem: new Date().toISOString() };
    }
    if (options?.atualizarDataFim && method === 'PATCH') {
      requestBody = { ...body, cr4a1_data_peritagem_fim: new Date().toISOString() };
    }
    console.log('🔁 Proxy:', method || 'GET', dvUrl);
    const dvRes = await fetch(dvUrl, {
      method: method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });
    const responseText = await dvRes.text();
    let responseData;
    try { responseData = JSON.parse(responseText); } catch { responseData = { message: responseText }; }
    if (!dvRes.ok) {
      console.error('❌ Erro do Dataverse:', responseText);
      return res.status(dvRes.status).json({ error: responseData, status: dvRes.status });
    }
    res.status(dvRes.status).json(responseData);
  } catch (error) {
    console.error('Erro no proxy:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/upload-foto-temp', async (req, res) => {
  const { os, itemId, fotoBase64 } = req.body;
  if (!os || !fotoBase64) {
    return res.status(400).json({ message: 'OS e foto são obrigatórios' });
  }
  try {
    const graphToken = await getGraphToken();
    const drive = await getDocTecnicosDrive(graphToken);
    const tempFolder = `Fotos Peritagens/Temp/${os}`;
    await ensureFolderPath(graphToken, drive.id, tempFolder);
    const fileName = `${itemId || 'semitem'}_${uuidv4()}.jpg`;
    const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${encodeURIComponent(tempFolder)}/${fileName}:/content`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${graphToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });
    if (!uploadRes.ok) throw new Error(`Falha no upload temporário: ${await uploadRes.text()}`);
    const uploaded = await uploadRes.json();
    res.json({ url: uploaded.webUrl, id: uploaded.id, name: fileName });
  } catch (error) {
    console.error('Erro no upload temp:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/fotos-temp', async (req, res) => {
  const { os } = req.query;
  if (!os) return res.status(400).json({ message: 'OS é obrigatória' });
  try {
    const graphToken = await getGraphToken();
    const drive = await getDocTecnicosDrive(graphToken);
    const tempFolder = `Fotos Peritagens/Temp/${os}`;
    const encodedFolder = tempFolder.split('/').map(encodeURIComponent).join('/');
    const listUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${encodedFolder}:/children`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (!listRes.ok) {
      if (listRes.status === 404) return res.json([]);
      throw new Error(`Erro ao listar fotos temporárias: ${await listRes.text()}`);
    }
    const listData = await listRes.json();
    const fotos = listData.value
      .filter(item => item.file?.mimeType?.startsWith('image/'))
      .map(item => ({ id: item.id, name: item.name, url: item.webUrl }));
    res.json(fotos);
  } catch (error) {
    console.error('Erro ao listar fotos temp:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mover fotos selecionadas para o álbum definitivo
app.post('/api/mover-fotos-album', async (req, res) => {
  const { os, filial, cliente, selecoes } = req.body;
  if (!os || !Array.isArray(selecoes)) {
    return res.status(400).json({ message: 'OS e seleções são obrigatórios' });
  }

  try {
    const graphToken = await getGraphToken();
    const drive = await getDocTecnicosDrive(graphToken);
    const albumFolder = `Fotos Peritagens/${filial || 'SemFilial'}/${cliente || 'SemCliente'}/${os}/Peritagem`;
    await ensureFolderPath(graphToken, drive.id, albumFolder);

    const resultados = [];

    for (const sel of selecoes) {
      const { fotoId, quadradoNumero, itemId } = sel;

      let descricao = 'foto';
      if (itemId) {
        try {
          const itemSet = await resolveEntitySet('cr4a1_peritagem_b01');
          const tokenDV = await getAccessToken();
          const itemRes = await fetch(
            `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2/${itemSet}?$filter=cr4a1_item eq '${itemId}'&$select=cr4a1_descricao`,
            { headers: { Authorization: `Bearer ${tokenDV}`, Accept: 'application/json' } }
          );
          const itemData = await itemRes.json();
          if (itemData.value?.length > 0) {
            descricao = itemData.value[0].cr4a1_descricao || 'foto';
          }
        } catch { }
      }

      // Sanitiza a descrição para nome de arquivo
      const descricaoSanitizada = descricao
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-]/g, '')
        .substring(0, 40);
      const novoNome = `${os}_${descricaoSanitizada}_${quadradoNumero}.jpg`;

      // Copiar o arquivo para a pasta de destino
      const copyUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/items/${fotoId}/copy`;
      const copyBody = {
        parentReference: {
          driveId: drive.id,
          path: `/drive/root:/${albumFolder}`,
        },
        name: novoNome,
      };

      console.log(`📋 Copiando foto ${fotoId} → ${novoNome}`);
      const copyRes = await fetch(copyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(copyBody),
      });

      if (!copyRes.ok) {
        const errText = await copyRes.text();
        console.error(`Erro ao copiar foto ${fotoId}:`, errText);
        resultados.push({ quadradoNumero, status: 'erro', message: errText });
        continue;
      }

      // Deletar o arquivo original (temporário)
      const deleteUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/items/${fotoId}`;
      const deleteRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${graphToken}`,
        },
      });

      if (!deleteRes.ok) {
        console.warn(`Não foi possível deletar a foto original ${fotoId}, mas a cópia foi feita.`);
      }

      resultados.push({ quadradoNumero, status: 'ok', url: `${albumFolder}/${novoNome}` });
    }

    res.json({ resultados });
  } catch (error) {
    console.error('Erro ao mover fotos:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/fotos', async (req, res) => {
  const { os } = req.query;
  if (!os) return res.status(400).json({ message: 'OS é obrigatória' });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Token inválido' }); }
  try {
    const cabSet = await resolveEntitySet('cr4a1_peritagem_cabecalho');
    const tokenDV = await getAccessToken();
    const cabRes = await fetch(
      `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2/${cabSet}?$filter=cr4a1_os eq '${encodeURIComponent(os)}'&$select=cr4a1_filial,cr4a1_cliente`,
      { headers: { Authorization: `Bearer ${tokenDV}`, Accept: 'application/json' } }
    );
    const cabData = await cabRes.json();
    const cab = cabData.value?.[0];
    if (!cab) return res.status(404).json({ message: 'Cabeçalho não encontrado' });
    const filial = cab.cr4a1_filial || 'SemFilial';
    const cliente = cab.cr4a1_cliente || 'SemCliente';

    const graphToken = await getGraphToken();
    const drive = await getDocTecnicosDrive(graphToken);
    const folderPath = `Fotos Peritagens/${filial}/${cliente}/${os}/Peritagem`;
    const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/');
    const listUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${encodedPath}:/children`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (!listRes.ok) {
      if (listRes.status === 404) return res.json([]);
      throw new Error(`Erro ao listar fotos: ${await listRes.text()}`);
    }
    const listData = await listRes.json();
    const fotos = listData.value
      .filter(item => item.file && item.file.mimeType?.startsWith('image/'))
      .map(item => ({
        id: item.id,
        name: item.name,
        url: item.webUrl,
        thumbnailUrl: item.thumbnails?.[0]?.medium?.url || item.webUrl,
      }));
    res.json(fotos);
  } catch (error) {
    console.error('Erro ao listar fotos:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/validar-os', async (req, res) => {
  const { os } = req.query;
  if (!os) return res.status(400).json({ message: 'OS é obrigatória' });
  try {
    const token = await getAccessToken();
    const zb6Set = await resolveEntitySet('cr4a1_zb6_relatorio');
    const zb6Url = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2/${zb6Set}?$filter=cr4a1_novacoluna eq '${encodeURIComponent(os)}'&$top=1`;
    const zb6Res = await fetch(zb6Url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const zb6Data = await zb6Res.json();
    const existeNaZb6 = zb6Data.value?.length > 0;

    const medroSet = await resolveEntitySet('cr4a1_base_medro');
    const medroUrl = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2/${medroSet}?$filter=cr4a1_os_comp eq '${encodeURIComponent(os)}'&$select=cr4a1_cliente,cr4a1_os_comp&$top=1`;
    const medroRes = await fetch(medroUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    const medroData = await medroRes.json();
    const existeNaMedro = medroData.value?.length > 0;
    const cliente = existeNaMedro ? medroData.value[0].cr4a1_cliente || '' : '';

    res.json({
      existeNaZb6,
      existeNaMedro,
      cliente,
      status: !existeNaZb6 && !existeNaMedro ? 'nao_encontrada' : (existeNaZb6 && !existeNaMedro ? 'apenas_zb6' : 'valida'),
    });
  } catch (error) {
    console.error('Erro ao validar OS:', error);
    res.status(500).json({ message: error.message });
  }
});

// Renomear fotos selecionadas para o álbum
app.post('/api/renomear-fotos-album', async (req, res) => {
  const { os, selecoes } = req.body;
  // selecoes: [{ fotoId, quadradoNumero, itemId }]
  if (!os || !Array.isArray(selecoes)) {
    return res.status(400).json({ message: 'OS e seleções são obrigatórios' });
  }

  try {
    const graphToken = await getGraphToken();
    const drive = await getDocTecnicosDrive(graphToken);
    // Pasta definitiva (já conhecida, podemos obtê-la do cabeçalho ou do contexto; como o frontend enviará filial/cliente, podemos usá-los)
    const { filial, cliente } = req.body;
    const albumFolder = `Fotos Peritagens/${filial || 'SemFilial'}/${cliente || 'SemCliente'}/${os}/Peritagem`;

    const resultados = [];

    for (const sel of selecoes) {
      const { fotoId, quadradoNumero, itemId } = sel;

      // Buscar nome original da foto
      const itemUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/items/${fotoId}`;
      const itemRes = await fetch(itemUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
      if (!itemRes.ok) {
        resultados.push({ quadradoNumero, status: 'erro', message: `Foto ${fotoId} não encontrada` });
        continue;
      }
      const itemData = await itemRes.json();
      const nomeOriginal = itemData.name;

      // Verificar se o nome contém '_temp_' (formato esperado: itemId_temp_guid.jpg)
      if (!nomeOriginal.includes('_temp_')) {
        resultados.push({ quadradoNumero, status: 'erro', message: 'Foto já está no formato final' });
        continue;
      }

      // Obter descrição do item (se possível)
      let descricao = 'foto';
      if (itemId) {
        try {
          const itemSet = await resolveEntitySet('cr4a1_peritagem_b01');
          const tokenDV = await getAccessToken();
          const itemQuery = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2/${itemSet}?$filter=cr4a1_item eq '${itemId}'&$select=cr4a1_descricao`;
          const itemDescRes = await fetch(itemQuery, { headers: { Authorization: `Bearer ${tokenDV}`, Accept: 'application/json' } });
          const itemDescData = await itemDescRes.json();
          if (itemDescData.value?.length > 0) descricao = itemDescData.value[0].cr4a1_descricao || 'foto';
        } catch { }
      }

      // Sanitizar descrição
      const descSanitizada = descricao
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-]/g, '')
        .substring(0, 40);

      const novoNome = `${os}_${descSanitizada}_${quadradoNumero}.jpg`;

      // Renomear via PATCH
      const renameUrl = `https://graph.microsoft.com/v1.0/drives/${drive.id}/items/${fotoId}`;
      const patchBody = { name: novoNome };
      const renameRes = await fetch(renameUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      });

      if (!renameRes.ok) {
        const errText = await renameRes.text();
        resultados.push({ quadradoNumero, status: 'erro', message: errText });
      } else {
        const updated = await renameRes.json();
        resultados.push({ quadradoNumero, status: 'ok', url: updated.webUrl });
      }
    }

    // Atualizar cr4a1_tem_fotos no cabeçalho (opcional)
    // ... (código já existente, se desejar manter)

    res.json({ resultados });
  } catch (error) {
    console.error('Erro ao renomear fotos:', error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor API rodando em http://localhost:${PORT}`);
});