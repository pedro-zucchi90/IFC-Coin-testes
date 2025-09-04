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

// GET /api/goal - Listar todas as metas (admin) ou metas disponíveis (usuário)
router.get('/', verificarToken, async (req, res) => {
    try {
        const { tipo, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Se for admin, mostrar todas as metas
        if (req.user.role === 'admin') {
            const filtros = {};
            if (tipo) {filtros.tipo = tipo;}

            const metas = await Goal.find(filtros)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Goal.countDocuments(filtros);

            res.json({
                metas: metas,
                paginacao: {
                    pagina: parseInt(page),
                    limite: parseInt(limit),
                    total,
                    paginas: Math.ceil(total / parseInt(limit))
                }
            });
        } else {
            // Para usuários normais, mostrar apenas metas ativas e válidas
            const filtros = { ativo: true };
            if (tipo) {filtros.tipo = tipo;}

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
        }

    } catch (error) {
        console.error('Erro ao listar metas:', error);
        res.status(500).json({
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/goal/listar - Listar metas disponíveis (compatibilidade)
router.get('/listar', verificarToken, async (req, res) => {
    try {
        const { tipo } = req.query;

        // Filtros: apenas metas ativas e válidas
        const filtros = { ativo: true };
        if (tipo) {
            filtros.tipo = tipo;
        }

        // Validade temporal: metas sem data de fim ou com data de fim futura
        const agora = new Date();
        filtros.$or = [
            { dataFim: null },
            { dataFim: { $gte: agora } }
        ];

        // Busca metas no banco (sem paginação)
        const metas = await Goal.find(filtros).sort({ createdAt: -1 });

        // Marca se o usuário já concluiu cada meta
        const metasComStatus = await Promise.all(metas.map(async (meta) => {
            const usuarioConcluiu = meta.usuariosConcluidos.includes(req.user._id);
            let temSolicitacaoPendente = false;

            if (!usuarioConcluiu && meta.requerAprovacao) {
                const pendente = await GoalRequest.findOne({
                    goal: meta._id,
                    aluno: req.user._id,
                    status: 'pendente'
                });
                temSolicitacaoPendente = !!pendente;
            }

            return {
                ...meta.toObject(),
                _id: meta._id.toString(), // garante que é string
                usuarioConcluiu,
                temSolicitacaoPendente
            };
        }));

        // Retorna apenas o array puro
        res.json(metasComStatus);

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

// POST /api/goal - Criar nova meta (admin)
router.post('/', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const { 
            titulo, 
            descricao, 
            tipo, 
            recompensa, 
            requerAprovacao,
            maxConclusoes,
            periodoValidade,
            dataInicio,
            dataFim,
            evidenciaObrigatoria,
            tipoEvidencia,
            descricaoEvidencia
        } = req.body;

        // Validação dos campos obrigatórios
        if (!titulo || !descricao || !tipo || !recompensa) {
            return res.status(400).json({
                message: 'Título, descrição, tipo e recompensa são obrigatórios'
            });
        }

        if (recompensa <= 0) {
            return res.status(400).json({
                message: 'Recompensa deve ser valores positivos'
            });
        }

        // Cria nova meta
        const novaMeta = new Goal({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            tipo,
            recompensa,
            usuariosConcluidos: [],
            requerAprovacao: !!requerAprovacao,
            maxConclusoes: maxConclusoes || null,
            periodoValidade: periodoValidade || null,
            dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
            dataFim: dataFim ? new Date(dataFim) : null,
            evidenciaObrigatoria: !!evidenciaObrigatoria,
            tipoEvidencia: tipoEvidencia || 'texto',
            descricaoEvidencia: descricaoEvidencia || null
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

// POST /api/goal/criar - Criar nova meta (professor/admin) - mantido para compatibilidade
router.post('/criar', verificarToken, verificarProfessor, async (req, res) => {
    try {
        const { titulo, descricao, tipo, recompensa, requerAprovacao } = req.body;

        // Validação dos campos obrigatórios
        if (!titulo || !descricao || !tipo || !recompensa) {
            return res.status(400).json({
                message: 'Todos os campos são obrigatórios'
            });
        }

        if (recompensa <= 0) {
            return res.status(400).json({
                message: 'Recompensa deve ser valores positivos'
            });
        }

        // Cria nova meta
        const novaMeta = new Goal({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            tipo,
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

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração do multer com filtro de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // pasta de destino
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
    
        const tiposPermitidos = /\.(jpeg|jpg|png|gif)$/i; // só extensão
    
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else if (file.mimetype === 'application/octet-stream' && tiposPermitidos.test(file.originalname)) {
            // Aceita o arquivo mesmo com mimetype genérico, se a extensão for correta
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens (jpeg, jpg, png, gif) são permitidas!'));
        }
    }
});

// POST /api/goal/concluir/:id - Solicitar conclusão de meta (usuário)
// Sua rota adaptada
router.post('/concluir/:id', verificarToken, upload.single('evidenciaArquivo'), async (req, res) => {
    try {
        const meta = await Goal.findById(req.params.id);

        if (!meta) {
            return res.status(404).json({ message: 'Meta não encontrada' });
        }

        if (!meta.ativo) {
            return res.status(400).json({ message: 'Meta não está mais ativa' });
        }

        if (meta.usuariosConcluidos.includes(req.user._id)) {
            return res.status(400).json({ message: 'Meta já foi concluída' });
        }

        if (meta.requerAprovacao) {
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

        // --- ALTERAÇÃO: Buscar o usuário do banco para garantir métodos do Mongoose ---
        const usuario = await User.findById(req.user._id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        meta.usuariosConcluidos.push(usuario._id);
        await meta.save();
        await usuario.adicionarCoins(meta.recompensa);

        await usuario.atualizarEstatisticas('meta_concluida');
        await usuario.atualizarEstatisticas('coins_ganhos', meta.recompensa);
        await usuario.verificarConquistas();

        const Transaction = require('../models/transactionModel');
        const transacao = new Transaction({
            tipo: 'recebido',
            origem: null,
            destino: usuario._id,
            quantidade: meta.recompensa,
            descricao: `Recompensa por concluir meta: ${meta.titulo}`,
            hash: `goal_${meta._id}_${usuario._id}_${Date.now()}`
        });

        await transacao.save();
        res.status(200).json({ message: 'Meta concluída com sucesso!', recompensaAdicionada: meta.recompensa });
    } catch (error) {
        console.error('Erro ao concluir meta:', error);
        res.status(500).json({ message: error.message || 'Erro interno do servidor' });
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

        // Adiciona flag metaExcluida e protege campos caso a meta seja null
        const solicitacoesComFlag = solicitacoes.map(solicitacao => {
            const obj = solicitacao.toObject();
            
            obj.metaExcluida = !solicitacao.goal; // true se goal for null
            obj.tituloMeta = solicitacao.goal ? solicitacao.goal.titulo : 'Meta deletada';
            obj.descricaoMeta = solicitacao.goal ? solicitacao.goal.descricao : 'A meta foi removida';
            obj.recompensaMeta = solicitacao.goal ? solicitacao.goal.recompensa : 0;

            return obj;
        });

        res.json(solicitacoesComFlag);

    } catch (error) {
        console.error('Erro ao listar solicitações:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});


// POST /api/goal/solicitacoes/:id/aprovar - Aprovar solicitação de conclusão de meta
router.post('/solicitacoes/:id/aprovar', verificarToken, async (req, res) => {
    try {
        // Verifica se o usuário tem permissão
        if (!["admin", "professor"].includes(req.user.role)) {
            return res.status(403).json({ message: 'Acesso negado' });
        }

        // Busca a solicitação e popula goal e aluno
        const solicitacao = await GoalRequest.findById(req.params.id)
            .populate('goal')
            .populate('aluno');

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

        const meta = solicitacao.goal;

        if (!meta) {
            // Caso a meta tenha sido deletada
            solicitacao.metaExcluida = true;
            await solicitacao.save();
            return res.json({ 
                message: 'Solicitação aprovada, mas a meta foi removida. Nenhum coin foi creditado.', 
                solicitacao 
            });
        }

        // Adiciona aluno à lista de concluintes se ainda não estiver
        if (!meta.usuariosConcluidos.includes(solicitacao.aluno._id)) {
            meta.usuariosConcluidos.push(solicitacao.aluno._id);
            await meta.save();

            // Adiciona coins ao aluno
            const aluno = solicitacao.aluno;
            await aluno.adicionarCoins(meta.recompensa);

            // Atualiza estatísticas
            await aluno.atualizarEstatisticas('meta_concluida');
            await aluno.atualizarEstatisticas('coins_ganhos', meta.recompensa);

            // Verifica conquistas
            await aluno.verificarConquistas();

            // Cria transação
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

        await solicitacao.save();
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
        const { 
            titulo, 
            descricao, 
            tipo, 
            requisito, 
            recompensa, 
            requerAprovacao,
            maxConclusoes,
            periodoValidade,
            dataInicio,
            dataFim,
            evidenciaObrigatoria,
            tipoEvidencia,
            descricaoEvidencia
        } = req.body;
        const metaId = req.params.id;

        const meta = await Goal.findById(metaId);
        if (!meta) {
            return res.status(404).json({
                message: 'Meta não encontrada'
            });
        }

        // Atualiza campos
        if (titulo !== undefined) { meta.titulo = titulo.trim(); }
        if (descricao !== undefined) { meta.descricao = descricao.trim(); }
        if (tipo !== undefined) { meta.tipo = tipo; }
        if (requisito !== undefined) { meta.requisito = requisito; }
        if (recompensa !== undefined) { meta.recompensa = recompensa; }
        if (requerAprovacao !== undefined) { meta.requerAprovacao = !!requerAprovacao; }
        if (maxConclusoes !== undefined) { meta.maxConclusoes = maxConclusoes; }
        if (periodoValidade !== undefined) { meta.periodoValidade = periodoValidade; }
        if (dataInicio !== undefined) { meta.dataInicio = dataInicio ? new Date(dataInicio) : new Date(); }
        if (dataFim !== undefined) { meta.dataFim = dataFim ? new Date(dataFim) : null; }
        if (evidenciaObrigatoria !== undefined) { meta.evidenciaObrigatoria = !!evidenciaObrigatoria; }
        if (tipoEvidencia !== undefined) { meta.tipoEvidencia = tipoEvidencia; }
        if (descricaoEvidencia !== undefined) { meta.descricaoEvidencia = descricaoEvidencia; }

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
            return res.status(404).json({ message: 'Meta não encontrada' });
        }

        // Marca goal como null em solicitações relacionadas para preservar histórico
        await GoalRequest.updateMany(
            { goal: meta._id, status: 'aprovada' }, // ou você pode incluir 'pendente' se quiser
            { $set: { goal: null } }
        );

        await Goal.findByIdAndDelete(req.params.id);

        res.json({ message: 'Meta deletada com sucesso, histórico de solicitações preservado' });

    } catch (error) {
        console.error('Erro ao deletar meta:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
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