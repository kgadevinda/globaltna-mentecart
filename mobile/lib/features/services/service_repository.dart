import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';

class ServiceRepository {
  const ServiceRepository({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<ServiceCatalog> fetchServices({
    String? search,
    String? category,
  }) async {
    final response = await _apiClient.get(
      '/services',
      queryParameters: {
        'page': 1,
        'limit': 20,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (category != null && category.trim().isNotEmpty) 'category': category.trim(),
      },
    );

    return ServiceCatalog.fromJson(response);
  }

  Future<ServiceDetail> fetchServiceDetail(String id) async {
    final response = await _apiClient.get('/services/$id');
    return ServiceDetail.fromJson(response['service'] as Map<String, dynamic>);
  }
}
