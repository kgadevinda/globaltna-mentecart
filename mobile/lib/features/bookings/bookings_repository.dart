import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';

class BookingsRepository {
  const BookingsRepository({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<List<BookingRecord>> fetchBookings() async {
    final response = await _apiClient.get('/bookings');
    return (response['bookings'] as List<dynamic>)
        .map((item) => BookingRecord.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<BookingRecord> cancelBooking(String id) async {
    final response = await _apiClient.post('/bookings/$id/cancel');
    return BookingRecord.fromJson(response['booking'] as Map<String, dynamic>);
  }
}
