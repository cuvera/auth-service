# SAML Authentication Setup Guide

## Overview
This guide explains how to configure SAML (Security Assertion Markup Language) authentication for the Cuvera Auth Service.

## Prerequisites
- A SAML Identity Provider (IdP) service (e.g., Okta, Auth0, Azure AD, etc.)
- SAML certificate files
- Proper network access to the IdP

## Required Environment Variables

Add these to your `.env` file:

```bash
# SAML Configuration
SAML_ENTRY_POINT=https://your-idp.com/sso
SAML_ISSUER=your-app-entity-id
SAML_CALLBACK_URL=http://localhost:3001/api/v1/auth/saml/callback
SAML_PRIVATE_KEY=path/to/private-key.pem
SAML_IDP_SSO_URL=https://your-idp.com/sso
SAML_IDP_SLO_URL=https://your-idp.com/slo
```

## Certificate Setup

### 1. Create the certificates directory
```bash
mkdir -p src/certs
```

### 2. Add your SAML certificates
Place your SAML certificates in the `src/certs/` directory:

- `MySAMLApp.pem` - Your IdP's public certificate
- `private-key.pem` - Your application's private key (if using encrypted assertions)

### 3. Certificate format
Certificates should be in PEM format:
```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvK8X7TMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
...
-----END CERTIFICATE-----
```

## Common Issues and Solutions

### Error: "Cannot read properties of undefined (reading '$')"
This error typically occurs when:
1. The SAML certificate file is missing or corrupted
2. The SAML configuration is incomplete
3. The IdP endpoint is not accessible

**Solutions:**
1. Verify the certificate file exists at `src/certs/MySAMLApp.pem`
2. Check that all required environment variables are set
3. Ensure the IdP endpoint is accessible from your server
4. Verify the certificate format is correct

### Error: "SAML authentication is not available"
This occurs when:
1. Required environment variables are missing
2. Certificate files are not found
3. SAML strategy failed to initialize

**Solutions:**
1. Check the server logs for SAML configuration warnings
2. Verify all environment variables are set correctly
3. Ensure certificate files are in the correct location

## Testing SAML

### 1. Start the auth service
```bash
npm run dev
```

### 2. Check SAML availability
```bash
curl http://localhost:3001/api/v1/auth/providers
```

This should return available providers. If SAML is properly configured, it should include "saml".

### 3. Test SAML endpoint
```bash
curl http://localhost:3001/api/v1/auth/saml
```

If properly configured, this should redirect to your IdP.

## Troubleshooting

### Check server logs
Look for these log messages:
- "SAML certificate file not found" - Certificate file is missing
- "SAML authentication will not be available" - Configuration issue
- "Error reading SAML certificate" - File read error

### Verify IdP configuration
1. Ensure the IdP endpoint URLs are correct
2. Verify the entity ID matches your IdP configuration
3. Check that your IdP allows your application's callback URL

### Certificate validation
1. Verify certificate format (PEM)
2. Check certificate expiration
3. Ensure the certificate matches your IdP

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **HTTPS**: Always use HTTPS in production
3. **Certificate Rotation**: Implement proper certificate rotation procedures
4. **Access Control**: Restrict access to certificate files

## Support

If you continue to experience issues:
1. Check the server logs for detailed error messages
2. Verify your IdP configuration
3. Test with a simple SAML test application first
4. Contact your IdP provider for configuration assistance
