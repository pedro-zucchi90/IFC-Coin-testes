# Script de Criação de Metas - IFC Coin

Este script permite criar e gerenciar metas no sistema IFC Coin de forma interativa.

## Como usar

### Executar o script
```bash
cd backend
node scripts/criar_metas.js
```

### Opções disponíveis

1. **Criar metas pré-definidas** - Cria um conjunto de metas padrão organizadas por categoria
2. **Criar meta customizada** - Permite criar uma meta personalizada com configurações específicas
3. **Listar metas existentes** - Mostra todas as metas cadastradas no sistema
4. **Gerenciar metas** - Permite ativar/desativar metas existentes
5. **Sair** - Encerra o script

## Tipos de metas disponíveis

### 🎪 Evento
- Participação em eventos acadêmicos
- Organização de eventos
- Recompensas: 50-100 coins

### 👥 Indicação
- Indicação de novos usuários
- Indicação de professores
- Recompensas: 25-50 coins

### 📚 Desempenho
- Notas excelentes em provas
- Participação em projetos de pesquisa
- Apresentação de trabalhos
- Recompensas: 30-75 coins

### 🎯 Custom
- Metas personalizadas
- Voluntariado, leitura, etc.
- Recompensas: 40-80 coins

## Configurações de metas

### Campos obrigatórios
- **Título**: Nome da meta
- **Descrição**: Explicação detalhada da meta
- **Tipo**: Categoria da meta (evento/indicacao/desempenho/custom)
- **Recompensa**: Quantidade de coins a ser concedida

### Campos opcionais
- **Requer aprovação**: Se a meta precisa ser aprovada por professor/admin
- **Evidência obrigatória**: Se é necessário comprovar a conclusão
- **Tipo de evidência**: foto/documento/comprovante/texto
- **Máximo de conclusões**: Limite de usuários que podem concluir
- **Período de validade**: Dias de validade da meta

## Exemplos de uso

### Criar meta de evento
```
Título: Participação em Workshop
Descrição: Participe de um workshop de programação
Tipo: evento
Recompensa: 75
Requer aprovação: s
Evidência obrigatória: s
Tipo de evidência: foto
```

### Criar meta de desempenho
```
Título: Nota Excelente
Descrição: Obtenha nota 9.0 ou superior em qualquer matéria
Tipo: desempenho
Recompensa: 50
Requer aprovação: s
Evidência obrigatória: s
Tipo de evidência: foto
```

## Funcionalidades do script

- ✅ Criação automática de metas pré-definidas
- ✅ Interface interativa para metas customizadas
- ✅ Listagem organizada por tipo
- ✅ Gerenciamento de status (ativo/inativo)
- ✅ Validação de dados
- ✅ Prevenção de duplicatas
- ✅ Conexão automática com MongoDB

## Requisitos

- Node.js instalado
- MongoDB rodando
- Arquivo `.env` configurado com `MONGODB_URI`
- Dependências do backend instaladas (`npm install`)

## Estrutura do banco

As metas são salvas na coleção `goals` com a seguinte estrutura:
```javascript
{
  titulo: String,
  descricao: String,
  tipo: String, // evento, indicacao, desempenho, custom
  recompensa: Number,
  usuariosConcluidos: [ObjectId],
  ativo: Boolean,
  requerAprovacao: Boolean,
  maxConclusoes: Number,
  periodoValidade: Number,
  dataInicio: Date,
  dataFim: Date,
  evidenciaObrigatoria: Boolean,
  tipoEvidencia: String,
  descricaoEvidencia: String
}
```

