# Security & Privacy

## Data Protection

- All local data encrypted using AES-256-GCM
- Supports biometric and password dual authentication
- Offline-first approach to reduce network transmission
- Regular key rotation strategy

## Permission Management

- 📷 Camera permission - for taking photos
- 🖼️ Photo library permission - for selecting photos
- 🎤 Microphone permission - for voice recording
- 📍 Location permission - for location tagging
- 📅 Calendar permission - for date reminders

## Security Best Practices

### When Working with Sensitive Data

1. Never log sensitive information (passwords, tokens, personal data)
2. Always use secure storage for credentials
3. Implement proper input validation
4. Use HTTPS for all network requests
5. Regularly update dependencies to patch security vulnerabilities

### Code Security Guidelines

- Follow the principle of least privilege
- Validate all user inputs
- Sanitize data before storage
- Use parameterized queries to prevent SQL injection
- Implement proper error handling without exposing internals
