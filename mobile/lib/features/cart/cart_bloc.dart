import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';
import 'cart_repository.dart';

part 'cart_event.dart';
part 'cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc({
    required CartRepository cartRepository,
  })  : _cartRepository = cartRepository,
        super(const CartState()) {
    on<CartRequested>(_onRequested);
    on<CartItemAdded>(_onItemAdded);
    on<CartItemUpdated>(_onItemUpdated);
    on<CartItemRemoved>(_onItemRemoved);
    on<CartCheckoutRequested>(_onCheckoutRequested);
    on<CartPaymentLaunchHandled>(_onPaymentLaunchHandled);
  }

  final CartRepository _cartRepository;

  Future<void> _onRequested(CartRequested event, Emitter<CartState> emit) async {
    emit(state.copyWith(status: CartStatus.loading, clearFeedback: true));

    try {
      final cart = await _cartRepository.fetchCart();
      emit(state.copyWith(status: CartStatus.ready, cart: cart));
    } on ApiFailure catch (failure) {
      emit(state.copyWith(status: CartStatus.failure, errorMessage: failure.message));
    }
  }

  Future<void> _onItemAdded(CartItemAdded event, Emitter<CartState> emit) async {
    emit(state.copyWith(status: CartStatus.submitting, clearFeedback: true));

    try {
      final cart = await _cartRepository.addItem(
        serviceId: event.serviceId,
        scheduledAt: event.scheduledAt,
        quantity: event.quantity,
      );
      emit(
        state.copyWith(
          status: CartStatus.ready,
          cart: cart,
          successMessage: 'Slot added to cart.',
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: CartStatus.ready,
          errorMessage: failure.message,
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    }
  }

  Future<void> _onItemUpdated(CartItemUpdated event, Emitter<CartState> emit) async {
    emit(state.copyWith(status: CartStatus.submitting, clearFeedback: true));

    try {
      final cart = await _cartRepository.updateItem(
        itemId: event.itemId,
        scheduledAt: event.scheduledAt,
        quantity: event.quantity,
      );
      emit(
        state.copyWith(
          status: CartStatus.ready,
          cart: cart,
          successMessage: 'Cart updated.',
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: CartStatus.ready,
          errorMessage: failure.message,
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    }
  }

  Future<void> _onItemRemoved(CartItemRemoved event, Emitter<CartState> emit) async {
    emit(state.copyWith(status: CartStatus.submitting, clearFeedback: true));

    try {
      final cart = await _cartRepository.removeItem(event.itemId);
      emit(
        state.copyWith(
          status: CartStatus.ready,
          cart: cart,
          successMessage: 'Item removed from cart.',
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: CartStatus.ready,
          errorMessage: failure.message,
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    }
  }

  Future<void> _onCheckoutRequested(
    CartCheckoutRequested event,
    Emitter<CartState> emit,
  ) async {
    emit(state.copyWith(status: CartStatus.submitting, clearFeedback: true));

    try {
      final result = await _cartRepository.checkout(
        paymentMethod: event.paymentMethod,
        simulatePaymentSuccess: event.simulatePaymentSuccess,
        fullName: event.fullName,
        phone: event.phone,
        address: event.address,
        city: event.city,
        country: event.country,
      );

      emit(
        state.copyWith(
          status: CartStatus.ready,
          cart: const CartSnapshot.empty(),
          lastBooking: result.booking,
          paymentLaunchUrl: result.payment?.checkoutUrl,
          successMessage: result.payment != null
              ? 'PayHere checkout opened for booking ${result.booking.bookingNumber}. Complete payment to confirm it.'
              : 'Checkout completed. Booking ${result.booking.bookingNumber} created.',
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: CartStatus.ready,
          errorMessage: failure.message,
          feedbackTick: state.feedbackTick + 1,
        ),
      );
    }
  }

  void _onPaymentLaunchHandled(
    CartPaymentLaunchHandled event,
    Emitter<CartState> emit,
  ) {
    emit(state.copyWith(clearPaymentLaunch: true));
  }
}
