import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'auth_service.dart';
import '../config.dart';

class UserService {
  // baseUrl vem do config.dart
  final AuthService _authService = AuthService();

  // Atualizar perfil do usuário
  Future<bool> atualizarPerfil({
    required String nome,
    required String email,
    String? curso,
    File? fotoPerfilFile, // agora recebe o arquivo
  }) async {
    try {
      final token = _authService.token;
      if (token == null) throw Exception('Usuário não autenticado');

      var request = http.MultipartRequest(
        'PUT',
        Uri.parse('$baseUrl/user/perfil'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['nome'] = nome;
      request.fields['email'] = email;
      if (curso != null && curso.trim().isNotEmpty) request.fields['curso'] = curso;
      if (fotoPerfilFile != null) {
        request.files.add(await http.MultipartFile.fromPath(
          'fotoPerfil',
          fotoPerfilFile.path,
          contentType: MediaType('image', 'jpeg'),
        ));
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        // O backend deve retornar o novo caminho de fotoPerfil no usuário atualizado
        // Você pode atualizar o usuário local aqui se quiser
        return true;
      } else {
        final errorData = jsonDecode(responseBody);
        throw Exception(errorData['message'] ?? 'Erro ao atualizar perfil');
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erro de conexão: $e');
    }
  }
} 