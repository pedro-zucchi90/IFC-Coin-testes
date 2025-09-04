// Carrega variáveis de ambiente do arquivo .env (deve ser o primeiro)
require('dotenv').config(); // <--- DEVE vir antes de tudo

// Importa bibliotecas principais
const express = require('express'); // Framework web para Node.js
const mongoose = require('mongoose'); // ODM para MongoDB
const cors = require('cors'); // Middleware para habilitar CORS
const path = require('path'); // Utilitário para manipulação de caminhos
const os = require('os');
const networkInterfaces = os.networkInterfaces();

function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Pega apenas IPv4, não internos e que não sejam Tailscale
      if (iface.family === 'IPv4' && !iface.internal && !name.toLowerCase().includes('tailscale')) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIPv4();

// Importa rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Importa modelos do banco de dados
const User = require('./models/userModel');
const Transaction = require('./models/transactionModel');
const Goal = require('./models/goalModel');
const Achievement = require('./models/achievementModel');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração CORS mais permissiva para desenvolvimento
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta uploads (ex: fotos de perfil, evidências)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir arquivos estáticos do painel administrativo
app.use('/admin', express.static(path.join(__dirname, '../admin-web')));

console.log('Tentando conectar ao MongoDB...');
// Conecta ao banco de dados MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Conectado ao MongoDB');
})
.catch((err) => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// Rotas principais da API
app.use('/api/auth', authRoutes); // Autenticação e registro
app.use('/api/user', userRoutes); // Usuários
app.use('/api/transaction', require('./routes/transaction')); // Transações
app.use('/api/goal', require('./routes/goal')); // Metas
app.use('/api/achievement', require('./routes/achievement')); // Conquistas
app.use('/api/admin', require('./routes/admin')); // Administração

// Rota de teste para verificar se a API está online
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rota para o painel administrativo
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin-web/index.html'));
});

// Rota raiz - redireciona para o painel administrativo
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Middleware de tratamento de erros gerais
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Middleware para rotas não encontradas (404)
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Inicia o servidor na porta 3000 (ou definida no .env)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API disponível em: http://${localIP}:${PORT}/api`);
}); 
