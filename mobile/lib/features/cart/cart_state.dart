part of 'cart_bloc.dart';

enum CartStatus { loading, ready, failure, submitting }

class CartState extends Equatable {
  const CartState({
    this.status = CartStatus.loading,
    this.cart = const CartSnapshot.empty(),
    this.lastBooking,
    this.paymentLaunchUrl,
    this.errorMessage,
    this.successMessage,
    this.feedbackTick = 0,
  });

  final CartStatus status;
  final CartSnapshot cart;
  final BookingRecord? lastBooking;
  final String? paymentLaunchUrl;
  final String? errorMessage;
  final String? successMessage;
  final int feedbackTick;

  CartState copyWith({
    CartStatus? status,
    CartSnapshot? cart,
    BookingRecord? lastBooking,
    String? paymentLaunchUrl,
    String? errorMessage,
    String? successMessage,
    int? feedbackTick,
    bool clearFeedback = false,
    bool clearPaymentLaunch = false,
  }) {
    return CartState(
      status: status ?? this.status,
      cart: cart ?? this.cart,
      lastBooking: lastBooking ?? this.lastBooking,
      paymentLaunchUrl: clearPaymentLaunch ? null : paymentLaunchUrl ?? this.paymentLaunchUrl,
      errorMessage: clearFeedback ? null : errorMessage ?? this.errorMessage,
      successMessage: clearFeedback ? null : successMessage ?? this.successMessage,
      feedbackTick: feedbackTick ?? this.feedbackTick,
    );
  }

  @override
  List<Object?> get props => [
        status,
        cart,
        lastBooking,
        paymentLaunchUrl,
        errorMessage,
        successMessage,
        feedbackTick,
      ];
}
