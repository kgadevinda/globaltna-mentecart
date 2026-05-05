import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/session_storage.dart';

class AuthRepository {
  const AuthRepository({
    required ApiClient apiClient,
    required SessionStorage sessionStorage,
  })  : _apiClient = apiClient,
        _sessionStorage = sessionStorage;

  final ApiClient _apiClient;
  final SessionStorage _sessionStorage;

  Future<UserProfile?> restoreSession() async {
    final token = await _sessionStorage.readToken();
    if (token == null || token.isEmpty) {
      return null;
    }

    final response = await _apiClient.get('/auth/me');
    return UserProfile.fromJson(response['user'] as Map<String, dynamic>);
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/login',
      data: {
        'email': email.trim(),
        'password': password,
      },
    );

    final session = AuthSession.fromJson(response);
    await _sessionStorage.saveToken(session.token);
    return session;
  }

  Future<AuthSession> signup({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/signup',
      data: {
        'name': name.trim(),
        'email': email.trim(),
        'password': password,
      },
    );

    final session = AuthSession.fromJson(response);
    await _sessionStorage.saveToken(session.token);
    return session;
  }

  Future<void> logout() {
    return _sessionStorage.clearToken();
  }
}
