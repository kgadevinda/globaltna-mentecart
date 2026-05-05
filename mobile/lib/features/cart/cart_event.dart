part of 'cart_bloc.dart';

sealed class CartEvent extends Equatable {
  const CartEvent();

  @override
  List<Object?> get props => [];
}

final class CartRequested extends CartEvent {
  const CartRequested();
}

final class CartItemAdded extends CartEvent {
  const CartItemAdded({
    required this.serviceId,
    required this.scheduledAt,
    required this.quantity,
  });

  final String serviceId;
  final DateTime scheduledAt;
  final int quantity;

  @override
  List<Object?> get props => [serviceId, scheduledAt, quantity];
}

final class CartItemUpdated extends CartEvent {
  const CartItemUpdated({
    required this.itemId,
    this.scheduledAt,
    this.quantity,
  });

  final String itemId;
  final DateTime? scheduledAt;
  final int? quantity;

  @override
  List<Object?> get props => [itemId, scheduledAt, quantity];
}

final class CartItemRemoved extends CartEvent {
  const CartItemRemoved(this.itemId);

  final String itemId;

  @override
  List<Object?> get props => [itemId];
}

final class CartCheckoutRequested extends CartEvent {
  const CartCheckoutRequested({
    required this.paymentMethod,
    required this.simulatePaymentSuccess,
    this.fullName,
    this.phone,
    this.address,
    this.city,
    this.country,
  });

  final String paymentMethod;
  final bool simulatePaymentSuccess;
  final String? fullName;
  final String? phone;
  final String? address;
  final String? city;
  final String? country;

  @override
  List<Object?> get props => [
        paymentMethod,
        simulatePaymentSuccess,
        fullName,
        phone,
        address,
        city,
        country,
      ];
}

final class CartPaymentLaunchHandled extends CartEvent {
  const CartPaymentLaunchHandled();
}
