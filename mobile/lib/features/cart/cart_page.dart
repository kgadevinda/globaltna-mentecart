import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher_string.dart';

import '../../core/models/app_models.dart';
import '../../core/utils/formatters.dart';
import '../auth/auth_bloc.dart';
import '../bookings/bookings_bloc.dart';
import 'cart_bloc.dart';

class CartPage extends StatefulWidget {
  const CartPage({super.key});

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  String _paymentMethod = 'cash';
  bool _simulatePaymentSuccess = true;
  final _payHereFullNameController = TextEditingController();
  final _payHerePhoneController = TextEditingController();
  final _payHereAddressController = TextEditingController();
  final _payHereCityController = TextEditingController();
  final _payHereCountryController = TextEditingController(text: 'Sri Lanka');
  bool _prefilledPayHereName = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (_prefilledPayHereName) {
      return;
    }

    final authState = context.read<AuthBloc>().state;
    final suggestedName = authState.user?.name?.trim();

    if (suggestedName != null && suggestedName.isNotEmpty) {
      _payHereFullNameController.text = suggestedName;
    }

    _prefilledPayHereName = true;
  }

  @override
  void dispose() {
    _payHereFullNameController.dispose();
    _payHerePhoneController.dispose();
    _payHereAddressController.dispose();
    _payHereCityController.dispose();
    _payHereCountryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CartBloc, CartState>(
      listenWhen: (previous, current) =>
          previous.feedbackTick != current.feedbackTick ||
          previous.lastBooking?.id != current.lastBooking?.id ||
          previous.paymentLaunchUrl != current.paymentLaunchUrl,
      listener: (context, state) {
        final message = state.errorMessage ?? state.successMessage;
        if (message != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
        }

        if (state.lastBooking != null) {
          context.read<BookingsBloc>().add(const BookingsRequested());
        }

        if (state.paymentLaunchUrl != null) {
          _launchPayHereCheckout(context, state.paymentLaunchUrl!);
          context.read<CartBloc>().add(const CartPaymentLaunchHandled());
        }
      },
      builder: (context, state) {
        if (state.status == CartStatus.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state.cart.items.isEmpty) {
          return const Center(
            child: _CartMessageCard(
              title: 'Your cart is empty',
              message: 'Add a service slot from the catalogue to start a booking.',
            ),
          );
        }

        return Column(
          children: [
            Expanded(
              child: ListView(
                children: [
                  ...state.cart.items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _CartItemCard(item: item),
                    ),
                  ),
                  _CheckoutPanel(
                    paymentMethod: _paymentMethod,
                    simulatePaymentSuccess: _simulatePaymentSuccess,
                    subtotal: state.cart.subtotal,
                    itemCount: state.cart.itemCount,
                    onPaymentMethodChanged: (value) {
                      setState(() {
                        _paymentMethod = value;
                      });
                    },
                    onMockResultChanged: (value) {
                      setState(() {
                        _simulatePaymentSuccess = value;
                      });
                    },
                    onCheckout: state.status == CartStatus.submitting
                        ? null
                        : () => _submitCheckout(context),
                    payHereFullNameController: _payHereFullNameController,
                    payHerePhoneController: _payHerePhoneController,
                    payHereAddressController: _payHereAddressController,
                    payHereCityController: _payHereCityController,
                    payHereCountryController: _payHereCountryController,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _submitCheckout(BuildContext context) {
    if (_paymentMethod == 'payhere') {
      final missingFields = <String>[];

      if (_payHereFullNameController.text.trim().isEmpty) {
        missingFields.add('full name');
      }
      if (_payHerePhoneController.text.trim().isEmpty) {
        missingFields.add('phone');
      }
      if (_payHereAddressController.text.trim().isEmpty) {
        missingFields.add('address');
      }
      if (_payHereCityController.text.trim().isEmpty) {
        missingFields.add('city');
      }
      if (_payHereCountryController.text.trim().isEmpty) {
        missingFields.add('country');
      }

      if (missingFields.isNotEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Enter your ${missingFields.join(', ')} to continue with PayHere.')),
        );
        return;
      }
    }

    context.read<CartBloc>().add(
          CartCheckoutRequested(
            paymentMethod: _paymentMethod,
            simulatePaymentSuccess: _simulatePaymentSuccess,
            fullName: _paymentMethod == 'payhere' ? _payHereFullNameController.text : null,
            phone: _paymentMethod == 'payhere' ? _payHerePhoneController.text : null,
            address: _paymentMethod == 'payhere' ? _payHereAddressController.text : null,
            city: _paymentMethod == 'payhere' ? _payHereCityController.text : null,
            country: _paymentMethod == 'payhere' ? _payHereCountryController.text : null,
          ),
        );
  }

  Future<void> _launchPayHereCheckout(BuildContext context, String url) async {
    final launched = await launchUrlString(url);

    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open PayHere checkout automatically.')),
      );
    }
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({required this.item});

  final CartItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: SizedBox(
                    width: 92,
                    height: 92,
                    child: Image.network(
                      item.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: const Color(0xFFECE4DA),
                        alignment: Alignment.center,
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.title, style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 6),
                      Text(AppFormatters.titleize(item.category)),
                      const SizedBox(height: 6),
                      Text(AppFormatters.slot(item.scheduledAt)),
                      const SizedBox(height: 6),
                      Text('Hold expires ${AppFormatters.compact(item.holdExpiresAt)}'),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {
                    context.read<CartBloc>().add(CartItemRemoved(item.id));
                  },
                  icon: const Icon(Icons.delete_outline),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                IconButton.outlined(
                  onPressed: () {
                    if (item.quantity == 1) {
                      context.read<CartBloc>().add(CartItemRemoved(item.id));
                    } else {
                      context.read<CartBloc>().add(
                            CartItemUpdated(
                              itemId: item.id,
                              quantity: item.quantity - 1,
                            ),
                          );
                    }
                  },
                  icon: const Icon(Icons.remove),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    '${item.quantity}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton.outlined(
                  onPressed: item.quantity >= 5
                      ? null
                      : () {
                          context.read<CartBloc>().add(
                                CartItemUpdated(
                                  itemId: item.id,
                                  quantity: item.quantity + 1,
                                ),
                              );
                        },
                  icon: const Icon(Icons.add),
                ),
                const Spacer(),
                Text(
                  AppFormatters.currency(item.lineTotal),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: Color(0xFF0F5F66),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckoutPanel extends StatelessWidget {
  const _CheckoutPanel({
    required this.paymentMethod,
    required this.simulatePaymentSuccess,
    required this.subtotal,
    required this.itemCount,
    required this.onPaymentMethodChanged,
    required this.onMockResultChanged,
    required this.onCheckout,
    required this.payHereFullNameController,
    required this.payHerePhoneController,
    required this.payHereAddressController,
    required this.payHereCityController,
    required this.payHereCountryController,
  });

  final String paymentMethod;
  final bool simulatePaymentSuccess;
  final double subtotal;
  final int itemCount;
  final ValueChanged<String> onPaymentMethodChanged;
  final ValueChanged<bool> onMockResultChanged;
  final VoidCallback? onCheckout;
  final TextEditingController payHereFullNameController;
  final TextEditingController payHerePhoneController;
  final TextEditingController payHereAddressController;
  final TextEditingController payHereCityController;
  final TextEditingController payHereCountryController;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Checkout', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('$itemCount seats reserved across ${itemCount == 1 ? '1 line item' : 'multiple line items'}'),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final method in const ['cash', 'pay_on_arrival', 'mock_card', 'payhere'])
                  ChoiceChip(
                    selected: paymentMethod == method,
                    label: Text(AppFormatters.titleize(method)),
                    onSelected: (_) => onPaymentMethodChanged(method),
                  ),
              ],
            ),
            if (paymentMethod == 'payhere') ...[
              const SizedBox(height: 16),
              const Text(
                'Billing details for PayHere',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: payHereFullNameController,
                decoration: const InputDecoration(labelText: 'Full name'),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: payHerePhoneController,
                decoration: const InputDecoration(labelText: 'Phone'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: payHereAddressController,
                decoration: const InputDecoration(labelText: 'Address'),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: payHereCityController,
                decoration: const InputDecoration(labelText: 'City'),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: payHereCountryController,
                decoration: const InputDecoration(labelText: 'Country'),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 10),
              const Text(
                'PayHere opens a secure gateway window and confirms the booking after the backend verifies the payment callback.',
              ),
            ],
            if (paymentMethod == 'mock_card') ...[
              const SizedBox(height: 16),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  simulatePaymentSuccess ? 'Simulate payment success' : 'Simulate payment failure',
                ),
                subtitle: const Text(
                  'Use this to demonstrate both confirmed and failed booking paths.',
                ),
                value: simulatePaymentSuccess,
                onChanged: onMockResultChanged,
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Subtotal',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
                Text(
                  AppFormatters.currency(subtotal),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F5F66),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onCheckout,
                child: const Text('Complete Booking'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartMessageCard extends StatelessWidget {
  const _CartMessageCard({
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
