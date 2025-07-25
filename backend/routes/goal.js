// Rotas relacionadas a metas (Goal)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Goal = require('../models/goalModel');
const User = require('../models/userModel');
const GoalRequest = require('../models/goalRequestModel');
const { verificarToken, verificarAdmin, verificarProfessor } = require('../middleware/auth');

const router = express.Router();

// Configuração do multer para upload de evidências de metas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/evidencias';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Gera nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidencia-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB
  },
  fileFilter: function (req, file, cb) {
    // Permite apenas tipos específicos de arquivos
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// GET /api/goal/listar - Listar metas disponíveis
router.get('/listar', verificarToken, async (req, res) => {
    try {
        const { tipo, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Filtros: apenas metas ativas e válidas
        const filtros = { ativo: true };
        if (tipo) filtros.tipo = tipo;

        // Validade temporal: metas sem data de fim ou com data de fim futura
        const agora = new Date();
        filtros.$or = [
            { dataFim: null },
            { dataFim: { $gte: agora } }
        ];

        // Busca metas no banco
        const metas = await Goal.find(filtros)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Marca se o usuário já concluiu cada meta
        const metasComStatus = await Promise.all(metas.map(async (meta) => {
            const usuarioConcluiu = meta.usuariosConcluidos.includes(req.user._id);
            let temSolicitacaoPendente = false;
            if (!usuarioConcluiu && meta.requerAprovacao) {
                const pendente = await GoalRequest.findOne({ goal: meta._id, aluno: req.user._id, status: 'pendente' });
                temSolicitacaoPendente = !!pendente;
            }
            return {
                ...meta.toObject(),
                usuarioConcluiu,
                temSolicitacaoPendente
            };
        }));

        const total = await Goal.countDocuments(filtros);

        res.json({
            metas: metasComStatus,
            paginacao: {
                pagina: parseInt(page),
                limite: parseInt(limit),
                total,
                paginas: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Erro ao listar metas:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/goal/minhas - Listar metas concluídas pelo usuário logado
router.get('/minhas', verificarToken, async (req, res) => {
    try {
        const metas = await Goal.find({
            usuariosConcluidos: req.user._id
        }).sort({ createdAt: -1 });

        res.json(metas);

    } catch (error) {
        console.error('Erro ao buscar metas do usuário:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/goal/criar - Criar nova meta (professor/admin)
router.post('/criar', verificarToken, verificarProfessor, async (req, res) => {
    try {
        const { titulo, descricao, tipo, requisito, recompensa, requerAprovacao } = req.body;

        // Validação dos campos obrigatórios
        if (!titulo || !descricao || !tipo || !requisito || !recompensa) {
            return res.status(400).json({
                message: 'Todos os campos são obrigatórios'
            });
        }

        if (requisito <= 0 || recompensa <= 0) {
            return res.status(400).json({
                message: 'Requisito e recompensa devem ser valores positivos'
            });
        }

        // Cria nova meta
        const novaMeta = new Goal({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            tipo,
            requisito,
            recompensa,
            usuariosConcluidos: [],
            requerAprovacao: !!requerAprovacao
        });

        await novaMeta.save();

        res.status(201).json({
            message: 'Meta criada com sucesso',
            meta: novaMeta
        });

    } catch (error) {
        console.error('Erro ao criar meta:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/goal/concluir/:id - Solicitar conclusão de meta (usuário)
router.post('/concluir/:id', verificarToken, upload.single('evidenciaArquivo'), async (req, res) => {
    try {
        const meta = await Goal.findById(req.params.id);

        if (!meta) {
            return res.status(404).json({
                message: 'Meta não encontrada'
            });
        }

        // Verifica se a meta está ativa
        if (!meta.ativo) {
            return res.status(400).json({
                message: 'Meta não está mais ativa'
            });
        }

        // Verifica se o usuário já concluiu
        if (meta.usuariosConcluidos.includes(req.user._id)) {
            return res.status(400).json({
                message: 'Meta já foi concluída'
            });
        }

        // Se requer aprovação, criar GoalRequest pendente
        if (meta.requerAprovacao) {
            // Verifica se já existe solicitação pendente para essa meta e usuário
            const jaSolicitada = await GoalRequest.findOne({ goal: meta._id, aluno: req.user._id, status: 'pendente' });
            if (jaSolicitada) {
                return res.status(400).json({ message: 'Já existe uma solicitação pendente para essa meta.' });
            }
            let evidenciaArquivoPath = undefined;
            if (req.file) {
                evidenciaArquivoPath = req.file.path;
            }
            const goalRequest = new GoalRequest({
                goal: meta._id,
                aluno: req.user._id,
                comentario: req.body.comentario,
                evidenciaTexto: req.body.evidenciaTexto,
                evidenciaArquivo: evidenciaArquivoPath,
                status: 'pendente',
            });
            await goalRequest.save();
            return res.status(200).json({ message: 'Solicitação enviada para análise!', goalRequest });
        }

        // Se não requer aprovação, concluir direto
        meta.usuariosConcluidos.push(req.user._id);
        await meta.save();
        await req.user.adicionarCoins(meta.recompensa);
        const Transaction = require('../models/transactionModel');
        const transacao = new Transaction({
            tipo: 'recebido',
            origem: null, // Sistema
            destino: req.user._id,
            quantidade: meta.recompensa,
            descricao: `Recompensa por concluir meta: ${meta.titulo}`,
            hash: `goal_${meta._id}_${req.user._id}_${Date.now()}`
        });
        await transacao.save();
        res.status(200).json({ message: 'Meta concluída com sucesso!', recompensaAdicionada: meta.recompensa });
    } catch (error) {
        console.error('Erro ao concluir meta:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// GET /api/goal/solicitacoes - Listar solicitações de conclusão de meta (admin/professor)
router.get('/solicitacoes', verificarToken, async (req, res) => {
    try {
        // Apenas admin ou professor pode ver todas
        if (!["admin", "professor"].includes(req.user.role)) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        const status = req.query.status;
        const filtro = status ? { status } : {};
        const solicitacoes = await GoalRequest.find(filtro)
            .populate('goal')
            .populate('aluno', 'nome email matricula')
            .sort({ createdAt: -1 });
        res.json(solicitacoes);
    } catch (error) {
        console.error('Erro ao listar solicitações:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// POST /api/goal/solicitacoes/:id/aprovar - Aprovar solicitação de conclusão de meta
router.post('/solicitacoes/:id/aprovar', verificarToken, async (req, res) => {
    try {
        if (!["admin", "professor"].includes(req.user.role)) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        const solicitacao = await GoalRequest.findById(req.params.id).populate('goal').populate('aluno');
        if (!solicitacao) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
        }
        if (solicitacao.status !== 'pendente') {
            return res.status(400).json({ message: 'Solicitação já foi processada' });
        }
        // Marcar como aprovada
        solicitacao.status = 'aprovada';
        solicitacao.analisadoPor = req.user._id;
        solicitacao.dataAnalise = new Date();
        solicitacao.resposta = req.body.resposta;
        await solicitacao.save();
        // Marcar meta como concluída para o aluno
        const meta = await Goal.findById(solicitacao.goal._id);
        if (!meta.usuariosConcluidos.includes(solicitacao.aluno._id)) {
            meta.usuariosConcluidos.push(solicitacao.aluno._id);
            await meta.save();
            // Adicionar coins ao aluno
            const aluno = await User.findById(solicitacao.aluno._id);
            await aluno.adicionarCoins(meta.recompensa);
            // Criar transação
            const Transaction = require('../models/transactionModel');
            const transacao = new Transaction({
                tipo: 'recebido',
                origem: null,
                destino: aluno._id,
                quantidade: meta.recompensa,
                descricao: `Recompensa por concluir meta: ${meta.titulo}`,
                hash: `goal_${meta._id}_${aluno._id}_${Date.now()}`
            });
            await transacao.save();
        }
        res.json({ message: 'Solicitação aprovada e coins creditados!', solicitacao });
    } catch (error) {
        console.error('Erro ao aprovar solicitação:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// POST /api/goal/solicitacoes/:id/recusar - Recusar solicitação de conclusão de meta
router.post('/solicitacoes/:id/recusar', verificarToken, async (req, res) => {
    try {
        if (!["admin", "professor"].includes(req.user.role)) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        const solicitacao = await GoalRequest.findById(req.params.id).populate('goal').populate('aluno');
        if (!solicitacao) {
            return res.status(404).json({ message: 'Solicitação não encontrada' });
        }
        if (solicitacao.status !== 'pendente') {
            return res.status(400).json({ message: 'Solicitação já foi processada' });
        }
        solicitacao.status = 'recusada';
        solicitacao.analisadoPor = req.user._id;
        solicitacao.dataAnalise = new Date();
        solicitacao.resposta = req.body.resposta;
        await solicitacao.save();
        res.json({ message: 'Solicitação recusada.', solicitacao });
    } catch (error) {
        console.error('Erro ao recusar solicitação:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

// PUT /api/goal/:id - Atualizar meta (admin)
router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const { titulo, descricao, tipo, requisito, recompensa, requerAprovacao } = req.body;
        const metaId = req.params.id;

        const meta = await Goal.findById(metaId);
        if (!meta) {
            return res.status(404).json({
                message: 'Meta não encontrada'
            });
        }

        // Atualiza campos
        if (titulo) meta.titulo = titulo.trim();
        if (descricao) meta.descricao = descricao.trim();
        if (tipo) meta.tipo = tipo;
        if (requisito !== undefined) meta.requisito = requisito;
        if (recompensa !== undefined) meta.recompensa = recompensa;
        if (requerAprovacao !== undefined) meta.requerAprovacao = !!requerAprovacao;

        await meta.save();

        res.json({
            message: 'Meta atualizada com sucesso',
            meta
        });

    } catch (error) {
        console.error('Erro ao atualizar meta:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/goal/:id - Deletar meta (admin)
router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const meta = await Goal.findById(req.params.id);

        if (!meta) {
            return res.status(404).json({
                message: 'Meta não encontrada'
            });
        }

        await Goal.findByIdAndDelete(req.params.id);

        res.json({
            message: 'Meta deletada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar meta:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/goal/:id - Obter meta específica
router.get('/:id', verificarToken, async (req, res) => {
    try {
        const meta = await Goal.findById(req.params.id);

        if (!meta) {
            return res.status(404).json({
                message: 'Meta não encontrada'
            });
        }

        // Verifica se o usuário já concluiu
        const usuarioConcluiu = meta.usuariosConcluidos.includes(req.user._id);
        
        res.json({
            ...meta.toObject(),
            usuarioConcluiu
        });

    } catch (error) {
        console.error('Erro ao obter meta:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// Servir arquivos estáticos (evidências)
router.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

module.exports = router; 