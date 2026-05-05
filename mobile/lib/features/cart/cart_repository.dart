import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';

class CartRepository {
  const CartRepository({
    required ApiClient apiClient,
  }) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<CartSnapshot> fetchCart() async {
    final response = await _apiClient.get('/cart');
    return CartSnapshot.fromJson(response['cart'] as Map<String, dynamic>);
  }

  Future<CartSnapshot> addItem({
    required String serviceId,
    required DateTime scheduledAt,
    required int quantity,
  }) async {
    final response = await _apiClient.post(
      '/cart/items',
      data: {
        'serviceId': serviceId,
        'scheduledAt': scheduledAt.toUtc().toIso8601String(),
        'quantity': quantity,
      },
    );

    return CartSnapshot.fromJson(response['cart'] as Map<String, dynamic>);
  }

  Future<CartSnapshot> updateItem({
    required String itemId,
    DateTime? scheduledAt,
    int? quantity,
  }) async {
    final data = <String, dynamic>{};
    if (scheduledAt != null) {
      data['scheduledAt'] = scheduledAt.toUtc().toIso8601String();
    }
    if (quantity != null) {
      data['quantity'] = quantity;
    }

    final response = await _apiClient.patch(
      '/cart/items/$itemId',
      data: data,
    );

    return CartSnapshot.fromJson(response['cart'] as Map<String, dynamic>);
  }

  Future<CartSnapshot> removeItem(String itemId) async {
    final response = await _apiClient.delete('/cart/items/$itemId');
    return CartSnapshot.fromJson(response['cart'] as Map<String, dynamic>);
  }

  Future<CheckoutResult> checkout({
    required String paymentMethod,
    required bool simulatePaymentSuccess,
    String? fullName,
    String? phone,
    String? address,
    String? city,
    String? country,
  }) async {
    final data = <String, dynamic>{
      'paymentMethod': paymentMethod,
      'simulatePaymentSuccess': simulatePaymentSuccess,
    };

    if (paymentMethod == 'payhere') {
      data['billingDetails'] = {
        'fullName': fullName?.trim(),
        'phone': phone?.trim(),
        'address': address?.trim(),
        'city': city?.trim(),
        'country': country?.trim(),
      };
    }

    final response = await _apiClient.post(
      '/bookings/checkout',
      data: data,
    );

    return CheckoutResult.fromJson(response);
  }
}
