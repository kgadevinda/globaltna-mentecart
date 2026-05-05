import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/utils/formatters.dart';
import '../cart/cart_bloc.dart';
import 'catalog_bloc.dart';
import 'service_detail_page.dart';

class CatalogPage extends StatefulWidget {
  const CatalogPage({super.key});

  @override
  State<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends State<CatalogPage> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search cleaning, tutoring, plumbing...',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              onPressed: () {
                _searchController.clear();
                context.read<CatalogBloc>().add(const CatalogSearchChanged(''));
              },
              icon: const Icon(Icons.clear),
            ),
          ),
          onChanged: (value) {
            context.read<CatalogBloc>().add(CatalogSearchChanged(value));
          },
        ),
        const SizedBox(height: 16),
        Expanded(
          child: BlocBuilder<CatalogBloc, CatalogState>(
            builder: (context, state) {
              if (state.status == CatalogStatus.loading && state.services.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }

              if (state.status == CatalogStatus.failure && state.services.isEmpty) {
                return _MessageCard(
                  title: 'Catalogue unavailable',
                  message: state.errorMessage ?? 'Try refreshing the list.',
                  actionLabel: 'Retry',
                  onPressed: () {
                    context.read<CatalogBloc>().add(const CatalogRequested());
                  },
                );
              }

              return RefreshIndicator(
                onRefresh: () async {
                  context.read<CatalogBloc>().add(const CatalogRequested());
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    _SummaryBanner(total: state.total),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ChoiceChip(
                          selected: state.category.isEmpty,
                          label: const Text('All'),
                          onSelected: (_) {
                            context.read<CatalogBloc>().add(const CatalogCategoryChanged(''));
                          },
                        ),
                        ...state.categories.map(
                          (category) => ChoiceChip(
                            selected: state.category == category,
                            label: Text(AppFormatters.titleize(category)),
                            onSelected: (_) {
                              context.read<CatalogBloc>().add(
                                    CatalogCategoryChanged(
                                      state.category == category ? '' : category,
                                    ),
                                  );
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (state.services.isEmpty)
                      const _MessageCard(
                        title: 'No services found',
                        message: 'Try a broader search or clear the category filter.',
                      )
                    else
                      ...state.services.map(
                        (service) => Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _ServiceCard(service: service),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SummaryBanner extends StatelessWidget {
  const _SummaryBanner({required this.total});

  final int total;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF0F5F66), Color(0xFF3C908B)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This week’s lineup',
            style: TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$total services ready for booking',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white),
          ),
          const SizedBox(height: 8),
          const Text(
            'Each booking slot enforces capacity and hold expiry so you can demonstrate real scheduling logic in the interview.',
            style: TextStyle(color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({required this.service});

  final ServiceSummary service;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: () {
        final cartBloc = context.read<CartBloc>();
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => BlocProvider.value(
              value: cartBloc,
              child: ServiceDetailPage(serviceId: service.id),
            ),
          ),
        );
      },
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    service.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: const Color(0xFFECE4DA),
                      alignment: Alignment.center,
                      child: const Icon(Icons.image_not_supported_outlined, size: 36),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      service.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  Text(
                    AppFormatters.currency(service.price),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: Color(0xFF0F5F66),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(service.description),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetaPill(label: AppFormatters.titleize(service.category)),
                  _MetaPill(label: '${service.durationMinutes} min'),
                  _MetaPill(label: '${service.slotCapacity} seats / slot'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F3EC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(label),
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({
    required this.title,
    required this.message,
    this.actionLabel,
    this.onPressed,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onPressed;

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
            if (actionLabel != null) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onPressed,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
