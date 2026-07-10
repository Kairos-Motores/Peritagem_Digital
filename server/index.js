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

// Cache de entity set names (chave: logical name, valor: entity set name)
const entitySetCache = {};

// ---------- CREDENCIAIS FIXAS DO SHAREPOINT ----------
const SHAREPOINT_SITE_ID = 'aplicativokm.sharepoint.com,471ed516-b1af-4b60-adb1-e33530b40fd2,64f58d5b-ed1a-40d5-9bb2-2b591721c859';
const SHAREPOINT_DRIVE_ID = 'b!FtUeRq-xYEutseM1MLQP0luN9WQa7dVAm7IrWRchyFnVHstz2SkdR6IH4JOZ3kJr';

// Token para Microsoft Graph (SharePoint)
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

// Obtém token de serviço (client credentials)
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

// Descobre o EntitySetName para qualquer tabela, com cache
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

// Rota de login
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

    const sessionToken = jwt.sign(
      { username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token: sessionToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para resolver entity set (endpoint público para o frontend)
app.get('/api/entityset', async (req, res) => {
  const logicalName = req.query.logicalName;
  if (!logicalName) {
    return res.status(400).json({ message: 'Parâmetro logicalName é obrigatório' });
  }
  try {
    const entitySetName = await resolveEntitySet(logicalName);
    res.json({ entitySetName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Rota proxy genérica para o Dataverse (com propagação detalhada de erros)
app.post('/api/dataverse', async (req, res) => {
  const { method, path, body, options } = req.body;
  if (!path) {
    return res.status(400).json({ message: 'Caminho não informado' });
    console.log('📥 Recebido:', method, path, body);
  }
  try {
    const token = await getAccessToken();
    const dvUrl = `${process.env.DATAVERSE_ENV_URL}/api/data/v9.2${path}`;

    let requestBody = body;
    // Injeta data de início se solicitado (criação de cabeçalho)
    if (options?.atualizarDataInicio && method === 'POST') {
      requestBody = {
        ...body,
        cr4a1_data_peritagem: new Date().toISOString(), // UTC do servidor
      };
    }
    // Injeta data final se solicitado (conclusão)
    if (options?.atualizarDataFim && method === 'PATCH') {
      requestBody = {
        ...body,
        cr4a1_data_peritagem_fim: new Date().toISOString(),
      };
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

// Endpoint de upload de foto
// Endpoint de upload de foto (busca dinâmica do drive "Doc Técnicos")
app.post('/api/upload-foto', async (req, res) => {
  const { os, fotoBase64, nomeArquivo } = req.body;
  if (!os || !fotoBase64) {
    return res.status(400).json({ message: 'OS e foto são obrigatórios' });
  }

  try {
    // 1. Buscar cabeçalho para obter filial e cliente
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

    // 2. Token do Graph
    const graphToken = await getGraphToken();

    // 3. Obter drives do site e localizar "Doc Técnicos"
    const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/drives`;
    const drivesRes = await fetch(drivesUrl, {
      headers: { Authorization: `Bearer ${graphToken}` },
    });
    if (!drivesRes.ok) {
      const err = await drivesRes.text();
      throw new Error(`Falha ao listar drives: ${err}`);
    }
    const drivesData = await drivesRes.json();
    const drive = drivesData.value.find(
      d => d.name === 'Doc Técnicos' || d.webUrl.includes('Doc%20Tcnicos')
    );
    if (!drive) {
      return res.status(404).json({ message: 'Biblioteca "Doc Técnicos" não encontrada no site' });
    }
    const driveId = drive.id;
    console.log(`📚 Drive encontrado: ${drive.name} (${drive.id})`);

    // 4. Criar pastas recursivamente
    const folderNames = ['Fotos Peritagens', filial, cliente, os, 'Peritagem'];
    let parentId = null; // raiz da biblioteca

    for (const folder of folderNames) {
      const encoded = encodeURIComponent(folder);
      const checkUrl = parentId
        ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}:/${encoded}:/`
        : `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encoded}:/`;

      const check = await fetch(checkUrl, {
        headers: { Authorization: `Bearer ${graphToken}` },
      });

      if (check.ok) {
        const item = await check.json();
        parentId = item.id;
        console.log(`📁 Pasta já existe: '${folder}'`);
      } else if (check.status === 404) {
        const createUrl = parentId
          ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}/children`
          : `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;

        const create = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${graphToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folder,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          }),
        });

        if (!create.ok) {
          const errText = await create.text();
          throw new Error(`Falha ao criar pasta '${folder}': ${errText}`);
        }
        const created = await create.json();
        parentId = created.id;
        console.log(`✅ Pasta criada: '${folder}'`);
      } else {
        const errText = await check.text();
        throw new Error(`Erro ao verificar pasta '${folder}': ${errText}`);
      }
    }

    // 5. Upload do arquivo
    const fileName = nomeArquivo || `${uuidv4()}.jpg`;
    const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentId}:/${fileName}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${graphToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Falha no upload: ${errText}`);
    }

    const uploaded = await uploadRes.json();
    res.json({ url: uploaded.webUrl, id: uploaded.id });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor API rodando em http://localhost:${PORT}`);
});