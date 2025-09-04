const mongoose = require('mongoose');
const Goal = require('../models/goalModel');
require('dotenv').config();

// Metas pré-definidas para diferentes tipos
const metasPredefinidas = {
    evento: [
        {
            titulo: "Participação em Evento Acadêmico",
            descricao: "Participe de um evento acadêmico (palestra, workshop, seminário) e comprove sua participação.",
            tipo: "evento",
            recompensa: 50,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "foto",
            descricaoEvidencia: "Foto do evento ou certificado de participação"
        },
        {
            titulo: "Organização de Evento",
            descricao: "Organize ou ajude na organização de um evento acadêmico ou cultural.",
            tipo: "evento",
            recompensa: 100,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "foto",
            descricaoEvidencia: "Foto do evento organizado ou comprovante de participação na organização"
        },
        {
            titulo: "Check-in na Biblioteca",
            descricao: "Visite a biblioteca do campus",
            tipo: "evento",
            recompensa: 10,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Visita ao Laboratório de Informática",
            descricao: "Realize uma visita ao laboratório de informática durante o horário de funcionamento.",
            tipo: "evento",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Participação em Feira de Cursos",
            descricao: "Faça check-in durante a feira de cursos do campus.",
            tipo: "evento",
            recompensa: 20,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Visita ao Auditório do Campus",
            descricao: "Visite o auditório do campus em horário permitido.",
            tipo: "evento",
            recompensa: 10,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
    ],
    indicacao: [
        {
            titulo: "Indicação de Novo Usuário",
            descricao: "Indique um novo usuário para a plataforma IFC Coin.",
            tipo: "indicacao",
            recompensa: 25,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Indicação de Professor",
            descricao: "Indique um professor para participar da plataforma.",
            tipo: "indicacao",
            recompensa: 50,
            requerAprovacao: true,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Compartilhar o App com Colega",
            descricao: "Compartilhe o aplicativo com um(a) colega e incentive o cadastro.",
            tipo: "indicacao",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Divulgar o Projeto em Rede Social",
            descricao: "Publique sobre o IFC Coin em uma rede social.",
            tipo: "indicacao",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Convidar Colega de Turma",
            descricao: "Convide um colega da sua turma a conhecer o IFC Coin.",
            tipo: "indicacao",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        }
    ],
    desempenho: [
        {
            titulo: "Nota Excelente em Prova",
            descricao: "Obtenha nota 9.0 ou superior em qualquer prova.",
            tipo: "desempenho",
            recompensa: 30,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "foto",
            descricaoEvidencia: "Foto da prova ou boletim com a nota"
        },
        {
            titulo: "Participação em Projeto de Pesquisa",
            descricao: "Participe ativamente de um projeto de pesquisa ou extensão.",
            tipo: "desempenho",
            recompensa: 75,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "documento",
            descricaoEvidencia: "Comprovante de participação no projeto"
        },
        {
            titulo: "Apresentação de Trabalho",
            descricao: "Apresente um trabalho acadêmico em evento ou seminário.",
            tipo: "desempenho",
            recompensa: 60,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "foto",
            descricaoEvidencia: "Foto da apresentação ou certificado"
        },
        {
            titulo: "Entrega de Atividade no Prazo",
            descricao: "Entregue uma atividade dentro do prazo estipulado pelo professor.",
            tipo: "desempenho",
            recompensa: 20,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Finalizar Quiz de Revisão",
            descricao: "Complete um quiz de revisão no aplicativo.",
            tipo: "desempenho",
            recompensa: 20,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Acessos Consecutivos (7 dias)",
            descricao: "Acesse o aplicativo por 7 dias consecutivos.",
            tipo: "desempenho",
            recompensa: 30,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        }
    ],
    custom: [
        {
            titulo: "Meta Personalizada - Voluntariado",
            descricao: "Realize 10 horas de trabalho voluntário em qualquer instituição.",
            tipo: "custom",
            recompensa: 40,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "documento",
            descricaoEvidencia: "Comprovante de horas de voluntariado"
        },
        {
            titulo: "Meta Personalizada - Leitura",
            descricao: "Leia 5 livros acadêmicos e faça um resumo de cada um.",
            tipo: "custom",
            recompensa: 80,
            requerAprovacao: true,
            evidenciaObrigatoria: true,
            tipoEvidencia: "documento",
            descricaoEvidencia: "Resumos dos livros lidos"
        },
        {
            titulo: "Completar Perfil no App",
            descricao: "Complete seu perfil adicionando informações básicas no aplicativo.",
            tipo: "custom",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Atualizar Foto de Perfil",
            descricao: "Adicione ou atualize sua foto de perfil no aplicativo.",
            tipo: "custom",
            recompensa: 10,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Vincular E-mail Institucional",
            descricao: "Associe seu e-mail institucional ao perfil.",
            tipo: "custom",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Responder Pesquisa de Satisfação",
            descricao: "Responda uma pesquisa rápida de satisfação dentro do app.",
            tipo: "custom",
            recompensa: 15,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        },
        {
            titulo: "Ler o Guia de Boas Práticas",
            descricao: "Leia o guia de boas práticas disponível no app.",
            tipo: "custom",
            recompensa: 10,
            requerAprovacao: false,
            evidenciaObrigatoria: false
        }
    ]
};

// Função para criar metas pré-definidas
async function criarMetasPredefinidas() {
    console.log('🎯 Criando metas pré-definidas...\n');
    
    let totalCriadas = 0;
    
    for (const [tipo, metas] of Object.entries(metasPredefinidas)) {
        console.log(`📋 Criando metas do tipo: ${tipo.toUpperCase()}`);
        
        for (const metaData of metas) {
            try {
                // Verificar se a meta já existe
                const metaExistente = await Goal.findOne({ 
                    titulo: metaData.titulo,
                    tipo: metaData.tipo 
                });
                
                if (metaExistente) {
                    console.log(`   ⚠️  Meta já existe: ${metaData.titulo}`);
                    continue;
                }
                
                const novaMeta = new Goal(metaData);
                await novaMeta.save();
                console.log(`   ✅ Criada: ${metaData.titulo} (${metaData.recompensa} coins)`);
                totalCriadas++;
                
            } catch (error) {
                console.log(`   ❌ Erro ao criar meta "${metaData.titulo}":`, error.message);
            }
        }
        console.log('');
    }
    
    console.log(`🎉 Total de metas criadas: ${totalCriadas}`);
    return totalCriadas;
}

// Função para criar meta customizada
async function criarMetaCustomizada() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    try {
        console.log('\n🎯 Criação de Meta Customizada\n');
        
        const titulo = await question('Título da meta: ');
        const descricao = await question('Descrição da meta: ');
        const tipo = await question('Tipo (evento/indicacao/desempenho/custom): ');
        const recompensa = parseInt(await question('Recompensa em coins: '));
        const requerAprovacao = (await question('Requer aprovação? (s/n): ')).toLowerCase() === 's';
        const evidenciaObrigatoria = (await question('Evidência obrigatória? (s/n): ')).toLowerCase() === 's';
        
        let tipoEvidencia = 'texto';
        let descricaoEvidencia = '';
        
        if (evidenciaObrigatoria) {
            tipoEvidencia = await question('Tipo de evidência (foto/documento/comprovante/texto): ');
            descricaoEvidencia = await question('Descrição da evidência necessária: ');
        }
        
        const maxConclusoes = await question('Máximo de conclusões (deixe vazio para ilimitado): ');
        const periodoValidade = await question('Período de validade em dias (deixe vazio para sempre válida): ');
        
        const metaData = {
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            tipo,
            recompensa,
            requerAprovacao,
            evidenciaObrigatoria,
            tipoEvidencia,
            descricaoEvidencia: descricaoEvidencia.trim(),
            maxConclusoes: maxConclusoes ? parseInt(maxConclusoes) : null,
            periodoValidade: periodoValidade ? parseInt(periodoValidade) : null,
            usuariosConcluidos: []
        };
        
        const novaMeta = new Goal(metaData);
        await novaMeta.save();
        
        console.log('\n✅ Meta customizada criada com sucesso!');
        console.log(`📋 Título: ${novaMeta.titulo}`);
        console.log(`💰 Recompensa: ${novaMeta.recompensa} coins`);
        console.log(`🔍 ID: ${novaMeta._id}`);
        
    } catch (error) {
        console.error('❌ Erro ao criar meta customizada:', error.message);
    } finally {
        rl.close();
    }
}

// Função para listar metas existentes
async function listarMetas() {
    console.log('\n📋 Metas existentes no sistema:\n');
    
    const metas = await Goal.find({}).sort({ tipo: 1, createdAt: -1 });
    
    if (metas.length === 0) {
        console.log('Nenhuma meta encontrada.');
        return;
    }
    
    const metasPorTipo = metas.reduce((acc, meta) => {
        if (!acc[meta.tipo]) {
            acc[meta.tipo] = [];
        }
        acc[meta.tipo].push(meta);
        return acc;
    }, {});
    
    for (const [tipo, metasDoTipo] of Object.entries(metasPorTipo)) {
        console.log(`🎯 ${tipo.toUpperCase()} (${metasDoTipo.length} metas):`);
        metasDoTipo.forEach(meta => {
            const status = meta.ativo ? '✅' : '❌';
            const aprovacao = meta.requerAprovacao ? '🔍' : '⚡';
            console.log(`   ${status} ${aprovacao} ${meta.titulo} (${meta.recompensa} coins)`);
        });
        console.log('');
    }
}

// Função para ativar/desativar metas
async function gerenciarMetas() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    try {
        console.log('\n⚙️  Gerenciamento de Metas\n');
        
        const metas = await Goal.find({}).sort({ titulo: 1 });
        
        if (metas.length === 0) {
            console.log('Nenhuma meta encontrada.');
            return;
        }
        
        console.log('Metas disponíveis:');
        metas.forEach((meta, index) => {
            const status = meta.ativo ? '✅ Ativa' : '❌ Inativa';
            console.log(`${index + 1}. ${meta.titulo} - ${status}`);
        });
        
        const escolha = await question('\nDigite o número da meta para gerenciar (ou 0 para voltar): ');
        const indice = parseInt(escolha) - 1;
        
        if (indice < 0 || indice >= metas.length) {
            console.log('Opção inválida.');
            return;
        }
        
        const meta = metas[indice];
        console.log(`\nMeta selecionada: ${meta.titulo}`);
        console.log(`Status atual: ${meta.ativo ? 'Ativa' : 'Inativa'}`);
        
        const novaAcao = await question('Deseja ativar (a) ou desativar (d) esta meta? ');
        
        if (novaAcao.toLowerCase() === 'a') {
            meta.ativo = true;
            await meta.save();
            console.log('✅ Meta ativada com sucesso!');
        } else if (novaAcao.toLowerCase() === 'd') {
            meta.ativo = false;
            await meta.save();
            console.log('❌ Meta desativada com sucesso!');
        } else {
            console.log('Ação inválida.');
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerenciar metas:', error.message);
    } finally {
        rl.close();
    }
}

// Função principal
async function main() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const question = (query) => new Promise(resolve => rl.question(query, resolve));
        
        while (true) {
            console.log('\n🎯 === SCRIPT DE CRIAÇÃO DE METAS ===');
            console.log('1. Criar metas pré-definidas');
            console.log('2. Criar meta customizada');
            console.log('3. Listar metas existentes');
            console.log('4. Gerenciar metas (ativar/desativar)');
            console.log('5. Sair');
            
            const opcao = await question('\nEscolha uma opção (1-5): ');
            
            switch (opcao) {
                case '1':
                    await criarMetasPredefinidas();
                    break;
                case '2':
                    await criarMetaCustomizada();
                    break;
                case '3':
                    await listarMetas();
                    break;
                case '4':
                    await gerenciarMetas();
                    break;
                case '5':
                    console.log('👋 Saindo...');
                    rl.close();
                    return;
                default:
                    console.log('❌ Opção inválida. Tente novamente.');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = {
    criarMetasPredefinidas,
    criarMetaCustomizada,
    listarMetas,
    gerenciarMetas
};
