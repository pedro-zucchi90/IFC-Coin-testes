import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'como_ganhar.dart';
import 'faq.dart';
import 'tela_login.dart';
import 'metas_screen.dart';
import 'admin_metas_screen.dart';
import 'admin_solicitacoes_professores_screen.dart';
import 'perfil_screen.dart';
import '../widgets/user_avatar.dart';
import 'historico_transacoes_screen.dart';
import 'admin_aprovar_transferencias_screen.dart';
import 'qr_code_receber_screen.dart';
import 'qr_code_ler_screen.dart';
import 'transferencia_screen.dart';
import 'dart:async';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  bool _isRefreshing = false;
  Timer? _autoRefreshTimer;
  int _lastKnownBalance = 0;
  bool _showBalanceUpdate = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startAutoRefresh();
  }

  void _startAutoRefresh() {
    // Atualizar dados automaticamente a cada 30 segundos
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (mounted && context.read<AuthProvider>().isLoggedIn) {
        _silentRefresh();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Atualizar dados quando a tela volta ao foco
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _silentRefresh();
      }
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    
    // Quando o app volta ao foco, atualizar dados silenciosamente
    if (state == AppLifecycleState.resumed) {
      _silentRefresh();
    }
  }

  Future<void> _silentRefresh() async {
    if (!mounted) return;
    
    try {
      await context.read<AuthProvider>().silentUpdateUserData();
      
      // Verificar se o saldo mudou e se o widget ainda está montado
      if (!mounted) return;
      
      final newBalance = context.read<AuthProvider>().user?.saldo ?? 0;
      if (newBalance != _lastKnownBalance && _lastKnownBalance > 0) {
        setState(() {
          _showBalanceUpdate = true;
        });
        
        // Esconder a animação após 2 segundos
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            setState(() {
              _showBalanceUpdate = false;
            });
          }
        });
      }
      
      _lastKnownBalance = newBalance;
    } catch (e) {
      // Ignorar erros em atualizações silenciosas
      if (mounted) {
        print('Erro na atualização silenciosa: $e');
      }
    }
  }

  Future<void> _refreshUserData() async {
    if (_isRefreshing || !mounted) return;
    
    setState(() {
      _isRefreshing = true;
    });

    try {
      await context.read<AuthProvider>().updateUserData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao atualizar: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.home, color: Colors.black),
          onPressed: () {
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (context) => const HomeScreen()),
              (Route<dynamic> route) => false,
            );
          },
        ),
        title: const Text(
          'Início',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w600,
            fontSize: 22,
          ),
        ),
        actions: [
          // Botão de QR Code
          IconButton(
            icon: const Icon(Icons.qr_code, color: Colors.black, size: 40),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                builder: (context) => Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListTile(
                        leading: Icon(Icons.qr_code, color: Colors.blue),
                        title: Text('Gerar QR Code para receber'),
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => QrCodeReceberScreen(),
                            ),
                          );
                        },
                      ),
                      ListTile(
                        leading: Icon(Icons.camera_alt, color: Colors.green),
                        title: Text('Ler QR Code para transferir'),
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => QrCodeLerScreen(),
                            ),
                          );
                        },
                      ),
                      ListTile(
                        leading: Icon(Icons.edit, color: Colors.orange),
                        title: Text('Digitar dados para transferir'),
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const TransferenciaScreen(),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          Consumer<AuthProvider>(
            builder: (context, authProvider, child) {
              return UserAvatar(
                radius: 20,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PerfilScreen(),
                    ),
                  );
                },
              );
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.black, size: 30),
            onSelected: (value) async {
              if (value == 'logout') {
                await context.read<AuthProvider>().logout();
                if (context.mounted) {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (context) => const TelaLogin()),
                  );
                }
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: const [
                    Icon(Icons.logout, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Sair'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshUserData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF42A5DA),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Text(
                      'Seu saldo atual:',
                      style: TextStyle(fontSize: 20, color: Color.fromARGB(221, 243, 243, 243)),
                    ),
                    const SizedBox(height: 6),
                    Consumer<AuthProvider>(
                      builder: (context, authProvider, child) {
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          decoration: BoxDecoration(
                            color: _showBalanceUpdate ? Colors.green.withOpacity(0.2) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          child: Text(
                            '${authProvider.user?.saldo ?? 0} IFC Coin',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 32,
                              color: Color.fromARGB(255, 253, 254, 255),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              
              Container(
                height: 100,
                margin: const EdgeInsets.only(bottom: 40),
                child: Image.asset(
                  'assets/ifc_coin_logo.png',
                  fit: BoxFit.fill,
                ),
              ),

              Consumer<AuthProvider>(
                builder: (context, authProvider, child) {
                  final isAdmin = authProvider.isAdmin;
                  
                  List<Widget> cards = [
                    _HomeCard(
                      icon: Icons.receipt_long,
                      iconColor: Color(0xFFE53935),
                      title: 'Histórico de Transações',
                      textColor: Color(0xFFE53935),
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const HistoricoTransacoesScreen(),
                          ),
                        );
                        // Atualizar dados após voltar da tela de histórico
                        await _refreshUserData();
                      },
                    ),
                    _HomeCard(
                      icon: Icons.attach_money,
                      iconColor: Color(0xFF388E3C),
                      title: 'Como Ganhar Coins',
                      textColor: Color(0xFF388E3C),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const ComoGanharScreen(),
                          ),
                        );
                      },
                    ),
                    _HomeCard(
                      icon: Icons.check_circle_outline,
                      iconColor: Color(0xFF1976D2),
                      title: (isAdmin || authProvider.isProfessor) ? 'Gerenciar Metas' : 'Metas',
                      textColor: Color(0xFF1976D2),
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => (isAdmin || authProvider.isProfessor)
                                ? const AdminMetasScreen() // Professores e admins acessam essa tela
                                : const MetasScreen(),     // Alunos acessam Metas normal
                          ),
                        );
                        // Atualizar dados após voltar das metas
                        await _refreshUserData();
                      },
                    ),
                    _HomeCard(
                      icon: Icons.help_outline,
                      iconColor: Color(0xFF9C27B0),
                      title: 'FAQ',
                      textColor: Color(0xFF9C27B0),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const FAQScreen(),
                          ),
                        );
                      },
                    ),
                  ];

                  // Adicionar botões específicos para admin (não professores)
                  if (isAdmin) {
                    cards.addAll([
                      _HomeCard(
                        icon: Icons.verified_user,
                        iconColor: Color(0xFF1976D2),
                        title: 'Aprovar Transferências',
                        textColor: Color(0xFF1976D2),
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AdminAprovarTransferenciasScreen(),
                            ),
                          );
                          // Atualizar dados após aprovar transferências
                          await _refreshUserData();
                        },
                      ),
                      _HomeCard(
                        icon: Icons.person_add,
                        iconColor: Color(0xFFFF9800),
                        title: 'Solicitações de\nProfessores',
                        textColor: Color(0xFFFF9800),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AdminSolicitacoesProfessoresScreen(),
                            ),
                          );
                        },
                      ),
                    ]);
                  }

                  
                  return GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 1.2,
                    children: cards,
                  );
                },
              ),
              const SizedBox(height: 55),
              const Text(
                'IFC Coin: Sua moeda digital\npor horas de dedicação na instituição.',
                style: TextStyle(fontSize: 14, color: Colors.black54),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final Color textColor;
  final VoidCallback onTap;

  const _HomeCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 10),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: iconColor, size: 36),
            const SizedBox(height: 10),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: textColor,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
