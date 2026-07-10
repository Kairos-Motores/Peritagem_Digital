// server/index.js
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Cache de entity set names (chave: logical name, valor: entity set name)
const entitySetCache = {};

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

app.listen(PORT, () => {
  console.log(`✅ Servidor API rodando em http://localhost:${PORT}`);
});