import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/transaction_service.dart';
import '../models/transaction_model.dart';
import 'home.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class TransferenciaScreen extends StatefulWidget {
  final String? matriculaInicial;
  final int? valorInicial;
  final String? descricaoInicial;
  final String? hashInicial;
  const TransferenciaScreen({super.key, this.matriculaInicial, this.valorInicial, this.descricaoInicial, this.hashInicial});

  @override
  State<TransferenciaScreen> createState() => _TransferenciaScreenState();
}

class _TransferenciaScreenState extends State<TransferenciaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _matriculaController = TextEditingController();
  final _valorController = TextEditingController();
  final _descricaoController = TextEditingController();
  final _senhaController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  Transaction? _transacaoRealizada;
  String? _qrData;
  // String? _hash; // não utilizado após remoção do fluxo de QR
  bool _matriculaTravada = false;

  @override
  void initState() {
    super.initState();
    if (widget.matriculaInicial != null) {
      _matriculaController.text = widget.matriculaInicial!;
    }
    if (widget.valorInicial != null) {
      _valorController.text = widget.valorInicial.toString();
    }
    if (widget.descricaoInicial != null) {
      _descricaoController.text = widget.descricaoInicial!;
    }
    // _hash = widget.hashInicial ?? const Uuid().v4();
  }

  // Removido botão de gerar QR; função não é mais utilizada

  // String _toJsonString(Map<String, dynamic> data) {
  //   return '{${data.entries.map((e) => '"${e.key}":"${e.value}"').join(',')}}';
  // }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    if (_senhaController.text.isEmpty) {
      setState(() { _error = 'Digite sua senha para confirmar.'; });
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
      _transacaoRealizada = null;
    });
    try {
      // Aqui você pode autenticar a senha se desejar (ex: AuthService().login...)
      final transacao = await TransactionService().transferir(
        destinoMatricula: _matriculaController.text.trim(),
        quantidade: int.parse(_valorController.text.trim()),
        descricao: _descricaoController.text.trim(),
      );
      setState(() {
        _transacaoRealizada = transacao;
        _isLoading = false;
      });
      
      // Atualizar dados do usuário após transação bem-sucedida
      try {
        await context.read<AuthProvider>().instantUpdateAfterTransaction();
      } catch (e) {
        // Ignorar erro de atualização, não afeta a transação
        print('Erro ao atualizar dados do usuário: $e');
      }
      
      if (mounted) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Icon(
                  transacao.status == 'pendente' ? Icons.pending : Icons.check_circle, 
                  color: transacao.status == 'pendente' ? Colors.orange : Colors.blue, 
                  size: 32
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    transacao.status == 'pendente' ? 'Transferência Pendente!' : 'Transferência Realizada!',
                    style: TextStyle(
                      fontSize: 20, 
                      fontWeight: FontWeight.bold, 
                      color: transacao.status == 'pendente' ? Colors.orange : Colors.blue
                    ),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transacao.status == 'pendente' 
                    ? 'A transferência foi enviada e está aguardando aprovação do administrador.'
                    : 'A transferência foi realizada com sucesso!', 
                  style: const TextStyle(fontSize: 16)
                ),
                const SizedBox(height: 12),
                Text('Hash: ${transacao.hash}', style: TextStyle(fontSize: 14, color: Colors.grey[700])),
                const SizedBox(height: 8),
                Text('Status: ${transacao.status ?? 'aprovada'}', style: TextStyle(fontSize: 14, color: Colors.grey[700])),
              ],
            ),
            actions: [
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (context) => const HomeScreen()),
                      (route) => false,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'OK',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transferir IFC Coin'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _transacaoRealizada == null
            ? (_qrData != null 
                ? _buildQrCodeView() 
                : Form(
                key: _formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: _matriculaController,
                        decoration: const InputDecoration(
                          labelText: 'Matrícula do destinatário',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Informe a matrícula' : null,
                        enabled: !_matriculaTravada, 
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _valorController,
                        decoration: const InputDecoration(
                          labelText: 'Valor (IFC Coin)',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Informe o valor';
                          final n = int.tryParse(v);
                          if (n == null || n <= 0) return 'Valor inválido';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descricaoController,
                        decoration: const InputDecoration(
                          labelText: 'Descrição (opcional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _senhaController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Senha da sua conta',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Digite sua senha' : null,
                      ),
                      const SizedBox(height: 24),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(_error!, style: TextStyle(color: Colors.red)),
                        ),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              icon: _isLoading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send),
                              label: const Text('Enviar'),
                              onPressed: _isLoading ? null : _enviar,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ))
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle, color: Colors.blue, size: 64),
                  const SizedBox(height: 16),
                  const Text('Transação Realizada!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.blue)),
                  const SizedBox(height: 8),
                  Text('Hash: ${_transacaoRealizada!.hash}', style: const TextStyle(fontSize: 14)),
                  const SizedBox(height: 8),
                  Text('Status: ${_transacaoRealizada!.status ?? 'aprovada'}', style: const TextStyle(fontSize: 16)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Voltar ao início'),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildQrCodeView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'QR Code de Transferência',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        const Text(
          'Mostre este QR Code para o destinatário',
          style: TextStyle(fontSize: 16, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
                             BoxShadow(
                 color: Colors.grey.withValues(alpha: 0.2),
                 spreadRadius: 2,
                 blurRadius: 8,
                 offset: const Offset(0, 4),
               ),
            ],
          ),
                     child: QrImageView(
             data: _qrData!,
             version: QrVersions.auto,
             size: 250.0,
             backgroundColor: Colors.white,
           ),
        ),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Column(
            children: [
              Text(
                'Destinatário: ${_matriculaController.text}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              Text(
                'Valor: ${_valorController.text} IFC Coins',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
              ),
              if (_descricaoController.text.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Descrição: ${_descricaoController.text}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 32),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  setState(() {
                    _qrData = null;
                    _matriculaTravada = false; 
                  });
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: Colors.blue),
                ),
                child: const Text(
                  'Voltar',
                  style: TextStyle(color: Colors.blue),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: _enviar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Enviar Direto',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
} 