import 'package:dio/dio.dart';

import '../config/app_environment.dart';
import '../storage/session_storage.dart';

class ApiFailure implements Exception {
  const ApiFailure({
    required this.message,
    this.statusCode,
  });

  final String message;
  final int? statusCode;

  factory ApiFailure.fromDio(DioException exception) {
    final data = exception.response?.data;
    final message = data is Map<String, dynamic>
        ? (data['message'] as String? ?? 'Request failed')
        : exception.message ?? 'Request failed';

    return ApiFailure(
      message: message,
      statusCode: exception.response?.statusCode,
    );
  }
}

class ApiClient {
  ApiClient(this._sessionStorage)
      : _dio = Dio(
          BaseOptions(
            baseUrl: AppEnvironment.apiBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: const {'Content-Type': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _sessionStorage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final SessionStorage _sessionStorage;
  final Dio _dio;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _execute(() => _dio.get<dynamic>(path, queryParameters: queryParameters));
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
  }) async {
    return _execute(() => _dio.post<dynamic>(path, data: data));
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? data,
  }) async {
    return _execute(() => _dio.patch<dynamic>(path, data: data));
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _execute(() => _dio.delete<dynamic>(path));
  }

  Future<Map<String, dynamic>> _execute(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      final data = response.data;

      if (data is Map<String, dynamic>) {
        return data;
      }

      throw const ApiFailure(message: 'Unexpected server response');
    } on DioException catch (exception) {
      throw ApiFailure.fromDio(exception);
    }
  }
}
