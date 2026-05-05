import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/models/app_models.dart';
import '../../core/network/api_client.dart';
import 'service_repository.dart';

part 'catalog_event.dart';
part 'catalog_state.dart';

class CatalogBloc extends Bloc<CatalogEvent, CatalogState> {
  CatalogBloc({
    required ServiceRepository serviceRepository,
  })  : _serviceRepository = serviceRepository,
        super(const CatalogState()) {
    on<CatalogRequested>(_onCatalogRequested);
    on<CatalogSearchChanged>(_onCatalogSearchChanged);
    on<CatalogCategoryChanged>(_onCatalogCategoryChanged);
  }

  final ServiceRepository _serviceRepository;

  Future<void> _onCatalogRequested(
    CatalogRequested event,
    Emitter<CatalogState> emit,
  ) async {
    await _loadCatalog(
      emit,
      searchQuery: event.searchQuery ?? state.searchQuery,
      category: event.category ?? state.category,
    );
  }

  Future<void> _onCatalogSearchChanged(
    CatalogSearchChanged event,
    Emitter<CatalogState> emit,
  ) async {
    await _loadCatalog(emit, searchQuery: event.searchQuery, category: state.category);
  }

  Future<void> _onCatalogCategoryChanged(
    CatalogCategoryChanged event,
    Emitter<CatalogState> emit,
  ) async {
    await _loadCatalog(emit, searchQuery: state.searchQuery, category: event.category);
  }

  Future<void> _loadCatalog(
    Emitter<CatalogState> emit, {
    required String searchQuery,
    required String category,
  }) async {
    emit(
      state.copyWith(
        status: CatalogStatus.loading,
        searchQuery: searchQuery,
        category: category,
        clearError: true,
      ),
    );

    try {
      final catalog = await _serviceRepository.fetchServices(
        search: searchQuery,
        category: category.isEmpty ? null : category,
      );

      emit(
        state.copyWith(
          status: CatalogStatus.success,
          services: catalog.items,
          total: catalog.total,
          searchQuery: searchQuery,
          category: category,
        ),
      );
    } on ApiFailure catch (failure) {
      emit(
        state.copyWith(
          status: CatalogStatus.failure,
          errorMessage: failure.message,
          searchQuery: searchQuery,
          category: category,
        ),
      );
    }
  }
}
