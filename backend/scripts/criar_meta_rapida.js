const mongoose = require('mongoose');
const Goal = require('../models/goalModel');
require('dotenv').config();

/**
 * Script para criação rápida de metas específicas
 * Uso: node scripts/criar_meta_rapida.js
 */

// Configurações da meta a ser criada
const configuracaoMeta = {
    titulo: "Participação em Aula Online",
    descricao: "Participe de uma aula online e envie evidência da participação.",
    tipo: "evento", // evento, indicacao, desempenho, custom
    recompensa: 30,
    requerAprovacao: true,
    evidenciaObrigatoria: true,
    tipoEvidencia: "foto",
    descricaoEvidencia: "Screenshot da aula online ou comprovante de participação",
    maxConclusoes: null, // null = ilimitado
    periodoValidade: 30, // dias, null = sempre válida
    ativo: true
};

async function criarMetaRapida() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');

        // Verificar se a meta já existe
        const metaExistente = await Goal.findOne({ 
            titulo: configuracaoMeta.titulo,
            tipo: configuracaoMeta.tipo 
        });

        if (metaExistente) {
            console.log(`⚠️  Meta já existe: ${configuracaoMeta.titulo}`);
            console.log(`📋 ID: ${metaExistente._id}`);
            console.log(`💰 Recompensa: ${metaExistente.recompensa} coins`);
            console.log(`🔍 Status: ${metaExistente.ativo ? 'Ativa' : 'Inativa'}`);
            return;
        }

        // Criar nova meta
        const novaMeta = new Goal({
            ...configuracaoMeta,
            usuariosConcluidos: [],
            dataInicio: new Date(),
            dataFim: configuracaoMeta.periodoValidade ? 
                new Date(Date.now() + configuracaoMeta.periodoValidade * 24 * 60 * 60 * 1000) : 
                null
        });

        await novaMeta.save();

        console.log('🎉 Meta criada com sucesso!');
        console.log(`📋 Título: ${novaMeta.titulo}`);
        console.log(`📝 Descrição: ${novaMeta.descricao}`);
        console.log(`🏷️  Tipo: ${novaMeta.tipo}`);
        console.log(`💰 Recompensa: ${novaMeta.recompensa} coins`);
        console.log(`🔍 Requer aprovação: ${novaMeta.requerAprovacao ? 'Sim' : 'Não'}`);
        console.log(`📸 Evidência obrigatória: ${novaMeta.evidenciaObrigatoria ? 'Sim' : 'Não'}`);
        if (novaMeta.evidenciaObrigatoria) {
            console.log(`📋 Tipo de evidência: ${novaMeta.tipoEvidencia}`);
            console.log(`📝 Descrição da evidência: ${novaMeta.descricaoEvidencia}`);
        }
        console.log(`👥 Máximo de conclusões: ${novaMeta.maxConclusoes || 'Ilimitado'}`);
        console.log(`⏰ Período de validade: ${novaMeta.periodoValidade ? `${novaMeta.periodoValidade} dias` : 'Sempre válida'}`);
        console.log(`📅 Data de início: ${novaMeta.dataInicio.toLocaleDateString('pt-BR')}`);
        if (novaMeta.dataFim) {
            console.log(`📅 Data de fim: ${novaMeta.dataFim.toLocaleDateString('pt-BR')}`);
        }
        console.log(`🆔 ID: ${novaMeta._id}`);
        console.log(`✅ Status: ${novaMeta.ativo ? 'Ativa' : 'Inativa'}`);

    } catch (error) {
        console.error('❌ Erro ao criar meta:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    console.log('🚀 Iniciando criação rápida de meta...\n');
    criarMetaRapida();
}

module.exports = { criarMetaRapida, configuracaoMeta };

