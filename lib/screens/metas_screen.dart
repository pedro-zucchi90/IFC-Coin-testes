import 'package:flutter/material.dart';
import '../models/goal_model.dart';
import '../services/goal_service.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../widgets/user_avatar.dart';
import 'perfil_screen.dart';

const Color azulPrincipal = Color(0xFF1976D2);

class MetasScreen extends StatefulWidget {
  const MetasScreen({super.key});

  @override
  State<MetasScreen> createState() => _MetasScreenState();
}

class _MetasScreenState extends State<MetasScreen> {
  final GoalService _goalService = GoalService();
  List<Goal> _metas = [];
  bool _isLoading = true;
  String? _error;
  String _selectedTipo = 'todos';

  @override
  void initState() {
    super.initState();
    _carregarMetas();
  }

  Future<void> _carregarMetas() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final metas = await _goalService.listarMetas(
        tipo: _selectedTipo == 'todos' ? null : _selectedTipo,
      );
      
      // Reorganizar lista: metas não concluídas primeiro, depois as concluídas
      final metasNaoConcluidas = metas.where((meta) => !(meta.usuarioConcluiu ?? false)).toList();
      final metasConcluidas = metas.where((meta) => meta.usuarioConcluiu ?? false).toList();
      
      setState(() {
        _metas = [...metasNaoConcluidas, ...metasConcluidas];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _concluirMetaDireta(Goal meta) async {
    try {
      await _goalService.concluirMeta(metaId: meta.id!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Meta "${meta.titulo}" concluída com sucesso! 🎉'),
            backgroundColor: Colors.green,
          ),
        );
        await _carregarMetas();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao concluir a meta: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _solicitarConclusaoMeta(Goal meta) async {
    final TextEditingController descricaoController = TextEditingController();
    final TextEditingController evidenciaTextoController = TextEditingController();
    File? evidenciaArquivo;
    bool isLoading = false;
    String? error;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            Future<void> pickImage() async {
              final picker = ImagePicker();
              final pickedFile = await picker.pickImage(source: ImageSource.gallery);
              if (pickedFile != null) {
                setState(() {
                  evidenciaArquivo = File(pickedFile.path);
                });
              }
            }

            return AlertDialog(
              title: Row(
                children: [
                  Icon(Icons.assignment_turned_in, color: azulPrincipal),
                  SizedBox(width: 8),
                  Expanded(child: Text('Solicitar conclusão de meta')),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(meta.titulo, style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(height: 12),
                    TextField(
                      controller: descricaoController,
                      decoration: InputDecoration(
                        labelText: 'Descrição (obrigatório)',
                        border: OutlineInputBorder(),
                      ),
                      minLines: 2,
                      maxLines: 4,
                    ),
                    SizedBox(height: 12),
                    TextField(
                      controller: evidenciaTextoController,
                      decoration: InputDecoration(
                        labelText: 'Evidência (texto opcional)',
                        border: OutlineInputBorder(),
                      ),
                      minLines: 1,
                      maxLines: 3,
                    ),
                    SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: pickImage,
                          icon: Icon(Icons.image),
                          label: Text('Anexar Imagem'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: azulPrincipal,
                            foregroundColor: Colors.white,
                          ),
                        ),
                        SizedBox(width: 8),
                        if (evidenciaArquivo != null)
                          Expanded(
                            child: Text(
                              evidenciaArquivo!.path.split('/').last,
                              style: TextStyle(fontSize: 12, color: Colors.green),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                    ),
                    if (error != null) ...[
                      SizedBox(height: 8),
                      Text(error!, style: TextStyle(color: Colors.red)),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isLoading ? null : () => Navigator.of(context).pop(),
                  child: Text('Cancelar', style: TextStyle(color: azulPrincipal)),
                ),
                ElevatedButton(
                  onPressed: isLoading
                      ? null
                      : () async {
                          if (descricaoController.text.trim().isEmpty) {
                            setState(() { error = 'Descrição é obrigatória.'; });
                            return;
                          }
                          setState(() { isLoading = true; error = null; });
                          try {
                            await _goalService.concluirMeta(
                              metaId: meta.id!,
                              evidenciaTexto: evidenciaTextoController.text.trim(),
                              comentario: descricaoController.text.trim(),
                              evidenciaArquivo: evidenciaArquivo,
                            );
                            if (mounted) {
                              Navigator.of(context).pop();
                              // SweetAlert/Dialog bonito após envio
                              await showDialog(
                                context: context,
                                builder: (context) => AlertDialog(
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  title: Row(
                                    children: const [
                                      Icon(Icons.hourglass_top, color: Colors.orange, size: 32),
                                      SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          'Solicitação enviada!',
                                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.orange),
                                        ),
                                      ),
                                    ],
                                  ),
                                  content: const Text(
                                    'Sua solicitação de conclusão de meta foi enviada para análise. Aguarde a aprovação de um professor ou administrador.',
                                    style: TextStyle(fontSize: 16),
                                  ),
                                  actions: [
                                    ElevatedButton(
                                      onPressed: () => Navigator.of(context).pop(),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.orange,
                                        foregroundColor: Colors.white,
                                      ),
                                      child: const Text('OK'),
                                    ),
                                  ],
                                ),
                              );
                              await _carregarMetas();
                            }
                          } catch (e) {
                            setState(() { error = e.toString(); isLoading = false; });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: azulPrincipal,
                    foregroundColor: Colors.white,
                  ),
                  child: isLoading
                      ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text('Enviar Solicitação'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Metas',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w600,
            fontSize: 24,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code, color: Colors.black, size: 40),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: UserAvatar(
              radius: 20,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PerfilScreen(),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtro por tipo
          Container(
            padding: const EdgeInsets.all(16),
            child: DropdownButtonFormField<String>(
              value: _selectedTipo,
              decoration: const InputDecoration(
                labelText: 'Filtrar por tipo',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'todos', child: Text('Todas')),
                DropdownMenuItem(value: 'evento', child: Text('Evento')),
                DropdownMenuItem(value: 'indicacao', child: Text('Indicação')),
                DropdownMenuItem(value: 'desempenho', child: Text('Desempenho')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedTipo = value!;
                });
                _carregarMetas();
              },
            ),
          ),
          
          // Lista de metas
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Erro ao carregar metas',
                              style: TextStyle(color: Colors.red),
                            ),
                            ElevatedButton(
                              onPressed: _carregarMetas,
                              child: Text('Tentar novamente'),
                            ),
                          ],
                        ),
                      )
                    : _metas.isEmpty
                        ? const Center(
                            child: Text(
                              'Nenhuma meta encontrada',
                              style: TextStyle(fontSize: 18),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _metas.length,
                            itemBuilder: (context, index) {
                              final meta = _metas[index];
                              final usuarioConcluiu = meta.usuarioConcluiu ?? false;
                              final solicitacaoPendente = meta.temSolicitacaoPendente ?? false;
                              
                              return Card(
                                margin: const EdgeInsets.only(bottom: 16),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              meta.titulo,
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: _getTipoColor(meta.tipo),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Text(
                                              meta.tipo.toUpperCase(),
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        meta.descricao,
                                        style: const TextStyle(fontSize: 16),
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Icon(Icons.star, color: Colors.amber, size: 20),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Recompensa: ${meta.recompensa} coins',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.amber,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      if (solicitacaoPendente)
                                        Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: Colors.yellow.shade100,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.yellow.shade700),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(Icons.hourglass_top, color: Colors.orange),
                                              const SizedBox(width: 8),
                                              Text(
                                                'Solicitação enviada!',
                                                style: TextStyle(
                                                  color: Colors.orange.shade800,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      else if (usuarioConcluiu)
                                        Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: Colors.green.shade50,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.green.shade200),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(Icons.check_circle, color: Colors.green),
                                              const SizedBox(width: 8),
                                              Text(
                                                'Meta concluída!',
                                                style: TextStyle(
                                                  color: Colors.green.shade700,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      else
                                        SizedBox(
                                          width: double.infinity,
                                          child: ElevatedButton(
                                            onPressed: () {
                                              if (meta.requerAprovacao == true) {
                                                _solicitarConclusaoMeta(meta);
                                              } else {
                                                _concluirMetaDireta(meta);
                                              }
                                            },
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: azulPrincipal,
                                              foregroundColor: Colors.white,
                                            ),
                                            child: Text(
                                              meta.requerAprovacao == true
                                                  ? 'Solicitar conclusão de meta'
                                                  : 'Concluir meta',
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Color _getTipoColor(String tipo) {
    switch (tipo) {
      case 'evento':
        return Colors.blue;
      case 'indicacao':
        return Colors.green;
      case 'desempenho':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }
} 