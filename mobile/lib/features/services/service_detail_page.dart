import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/utils/formatters.dart';
import '../cart/cart_bloc.dart';
import 'service_detail_bloc.dart';
import 'service_repository.dart';

class ServiceDetailPage extends StatefulWidget {
  const ServiceDetailPage({
    super.key,
    required this.serviceId,
  });

  final String serviceId;

  @override
  State<ServiceDetailPage> createState() => _ServiceDetailPageState();
}

class _ServiceDetailPageState extends State<ServiceDetailPage> {
  int _quantity = 1;
  ServiceSlot? _selectedSlot;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => ServiceDetailBloc(
        serviceRepository: context.read<ServiceRepository>(),
      )..add(ServiceDetailRequested(widget.serviceId)),
      child: BlocListener<CartBloc, CartState>(
        listenWhen: (previous, current) => previous.feedbackTick != current.feedbackTick,
        listener: (context, state) {
          final message = state.errorMessage ?? state.successMessage;
          if (message != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
          }
        },
        child: Scaffold(
          appBar: AppBar(),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: BlocBuilder<ServiceDetailBloc, ServiceDetailState>(
                builder: (context, state) {
                  if (state.status == ServiceDetailStatus.loading) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (state.status == ServiceDetailStatus.failure || state.service == null) {
                    return Center(
                      child: Text(state.errorMessage ?? 'Unable to load service details.'),
                    );
                  }

                  final service = state.service!;

                  return ListView(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: AspectRatio(
                          aspectRatio: 4 / 3,
                          child: Image.network(
                            service.summary.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              color: const Color(0xFFECE4DA),
                              alignment: Alignment.center,
                              child: const Icon(Icons.image_outlined, size: 40),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        service.summary.title,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(service.summary.description),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _DetailBadge(label: AppFormatters.currency(service.summary.price)),
                          _DetailBadge(label: '${service.summary.durationMinutes} min'),
                          _DetailBadge(label: AppFormatters.titleize(service.summary.category)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Choose a time slot',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      if (service.slots.isEmpty)
                        const Text('No slots available right now.')
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: service.slots.map((slot) {
                            final isSelected = _selectedSlot == slot;
                            final isDisabled = slot.remainingCapacity <= 0;
                            return ChoiceChip(
                              selected: isSelected,
                              label: Text(
                                '${AppFormatters.slot(slot.startsAt)}\n${slot.remainingCapacity} left',
                              ),
                              onSelected: isDisabled
                                  ? null
                                  : (_) {
                                      setState(() {
                                        _selectedSlot = slot;
                                      });
                                    },
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 24),
                      Text(
                        'Quantity',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          IconButton.outlined(
                            onPressed: _quantity > 1
                                ? () {
                                    setState(() {
                                      _quantity -= 1;
                                    });
                                  }
                                : null,
                            icon: const Icon(Icons.remove),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              '$_quantity',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          IconButton.outlined(
                            onPressed: _quantity < 5
                                ? () {
                                    setState(() {
                                      _quantity += 1;
                                    });
                                  }
                                : null,
                            icon: const Icon(Icons.add),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _selectedSlot == null
                              ? null
                              : () {
                                  context.read<CartBloc>().add(
                                        CartItemAdded(
                                          serviceId: service.summary.id,
                                          scheduledAt: _selectedSlot!.startsAt,
                                          quantity: _quantity,
                                        ),
                                      );
                                },
                          child: const Text('Add To Cart'),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailBadge extends StatelessWidget {
  const _DetailBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(label),
    );
  }
}
