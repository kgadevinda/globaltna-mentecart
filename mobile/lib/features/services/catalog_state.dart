part of 'catalog_bloc.dart';

enum CatalogStatus { loading, success, failure }

class CatalogState extends Equatable {
  const CatalogState({
    this.status = CatalogStatus.loading,
    this.services = const [],
    this.searchQuery = '',
    this.category = '',
    this.total = 0,
    this.errorMessage,
  });

  final CatalogStatus status;
  final List<ServiceSummary> services;
  final String searchQuery;
  final String category;
  final int total;
  final String? errorMessage;

  List<String> get categories {
    return services.map((service) => service.category).toSet().toList()..sort();
  }

  CatalogState copyWith({
    CatalogStatus? status,
    List<ServiceSummary>? services,
    String? searchQuery,
    String? category,
    int? total,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CatalogState(
      status: status ?? this.status,
      services: services ?? this.services,
      searchQuery: searchQuery ?? this.searchQuery,
      category: category ?? this.category,
      total: total ?? this.total,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, services, searchQuery, category, total, errorMessage];
}
