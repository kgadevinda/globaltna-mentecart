import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../core/network/api_client.dart';
import '../core/storage/session_storage.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/auth_bloc.dart';
import '../features/auth/auth_page.dart';
import '../features/auth/auth_repository.dart';
import '../features/bookings/bookings_bloc.dart';
import '../features/bookings/bookings_page.dart';
import '../features/bookings/bookings_repository.dart';
import '../features/cart/cart_bloc.dart';
import '../features/cart/cart_page.dart';
import '../features/cart/cart_repository.dart';
import '../features/home/app_shell.dart';
import '../features/services/catalog_bloc.dart';
import '../features/services/catalog_page.dart';
import '../features/services/service_repository.dart';

class MenteCartApp extends StatelessWidget {
  const MenteCartApp({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionStorage = SessionStorage();
    final apiClient = ApiClient(sessionStorage);

    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: sessionStorage),
        RepositoryProvider.value(value: apiClient),
        RepositoryProvider(
          create: (_) => AuthRepository(
            apiClient: apiClient,
            sessionStorage: sessionStorage,
          ),
        ),
        RepositoryProvider(
          create: (_) => ServiceRepository(apiClient: apiClient),
        ),
        RepositoryProvider(
          create: (_) => CartRepository(apiClient: apiClient),
        ),
        RepositoryProvider(
          create: (_) => BookingsRepository(apiClient: apiClient),
        ),
      ],
      child: BlocProvider(
        create: (context) => AuthBloc(
          authRepository: context.read<AuthRepository>(),
        )..add(const AuthStarted()),
        child: MaterialApp(
          title: 'MenteCart',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          home: const _AppView(),
        ),
      ),
    );
  }
}

class _AppView extends StatelessWidget {
  const _AppView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        switch (state.status) {
          case AuthStatus.checking:
            return const _SplashScreen();
          case AuthStatus.authenticated:
            return MultiBlocProvider(
              providers: [
                BlocProvider(
                  create: (context) => CatalogBloc(
                    serviceRepository: context.read<ServiceRepository>(),
                  )..add(const CatalogRequested()),
                ),
                BlocProvider(
                  create: (context) => CartBloc(
                    cartRepository: context.read<CartRepository>(),
                  )..add(const CartRequested()),
                ),
                BlocProvider(
                  create: (context) => BookingsBloc(
                    bookingsRepository: context.read<BookingsRepository>(),
                  )..add(const BookingsRequested()),
                ),
              ],
              child: AppShell(
                userName: state.user?.name ?? state.user?.email ?? 'Guest',
                pages: const [
                  CatalogPage(),
                  CartPage(),
                  BookingsPage(),
                ],
              ),
            );
          case AuthStatus.unauthenticated:
            return const AuthPage();
        }
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFF5E7D3),
              Color(0xFFE6F2EF),
              Color(0xFFD9E8F8),
            ],
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.event_available_rounded, size: 56, color: Color(0xFF0F5F66)),
              SizedBox(height: 16),
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Preparing your service dashboard...'),
            ],
          ),
        ),
      ),
    );
  }
}
