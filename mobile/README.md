# MenteCart Mobile

Flutter client for the MenteCart service-booking assessment.

## Run locally

Install packages:

```bash
flutter pub get
```

Run on the Android emulator:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

Run on Flutter web:

```bash
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000/api
```

Run on a local web server:

```bash
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 8080 --dart-define=API_BASE_URL=http://localhost:4000/api
```

## Notes

- The mobile app is customer-facing.
- Admin booking completion is exposed through the backend API.
- The backend must be running before the app can authenticate or load services.
