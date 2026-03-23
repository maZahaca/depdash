# OAuth Provider Setup Guide

This guide explains how to configure OAuth authentication providers for DepDash.

## Overview

DepDash supports multiple OAuth providers:
- Google OAuth 2.0
- GitHub OAuth
- GitLab OAuth

OAuth buttons are only displayed on the login page when the provider credentials are configured server-side.

---

## Google OAuth Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for public apps) or **Internal** (for G Suite orgs)
3. Fill in the required fields:
   - App name: `DepDash`
   - User support email: Your email
   - Developer contact email: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Save and continue

### 3. Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
5. Click **Create**
6. Copy your **Client ID** and **Client Secret**

### 4. Configure Environment Variables

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## GitHub OAuth Setup

### 1. Register a New OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - Application name: `DepDash`
   - Homepage URL: `http://localhost:3000` (or your domain)
   - Authorization callback URL:
     - `http://localhost:3000/api/auth/callback/github` (development)
     - `https://your-domain.com/api/auth/callback/github` (production)
4. Click **Register application**

### 2. Generate Client Secret

1. After creating the app, click **Generate a new client secret**
2. Copy your **Client ID** and **Client Secret** immediately

### 3. Configure Environment Variables

```env
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

---

## GitLab OAuth Setup

### 1. Register a New Application

1. Go to your GitLab instance (e.g., [gitlab.com](https://gitlab.com))
2. Navigate to **User Settings** → **Applications** (or for groups: **Group Settings** → **Applications**)
   - Direct link: `https://gitlab.com/-/profile/applications`
3. Click **Add new application**

### 2. Configure Application Details

Fill in the application details:

- **Name**: `DepDash`
- **Redirect URI**:
  - `http://localhost:3000/api/auth/callback/gitlab` (development)
  - `https://your-domain.com/api/auth/callback/gitlab` (production)
- **Confidential**: ✅ Check this box
- **Scopes**: Select the following:
  - `read_user` - Read user profile information
  - `openid` - OpenID Connect authentication
  - `profile` - Access user profile
  - `email` - Access user email

### 3. Save and Copy Credentials

1. Click **Save application**
2. Copy your **Application ID** (Client ID) and **Secret** (Client Secret)
3. **Important**: The secret is only shown once, so copy it immediately

### 4. Configure Environment Variables

```env
GITLAB_CLIENT_ID="your-gitlab-application-id"
GITLAB_CLIENT_SECRET="your-gitlab-secret"
```

### 5. Self-Hosted GitLab

If you're using a self-hosted GitLab instance instead of gitlab.com, add the `GITLAB_URL` environment variable:

```env
GITLAB_URL="https://gitlab.your-company.com"
```

**Important Notes:**
- The URL should be your GitLab instance base URL (e.g., `https://gitlab.your-company.com`)
- Do NOT include trailing slashes
- Do NOT include the `/oauth` or `/api` paths
- The URL must be accessible from your DepDash server
- For GitLab.com, leave `GITLAB_URL` unset (it defaults to `https://gitlab.com`)

**Example for Self-Hosted GitLab:**

```env
# Self-hosted GitLab configuration
GITLAB_CLIENT_ID="your-application-id-from-self-hosted-gitlab"
GITLAB_CLIENT_SECRET="your-secret-from-self-hosted-gitlab"
GITLAB_URL="https://gitlab.mycompany.internal"
```

**Redirect URI for Self-Hosted:**
When creating the application in your self-hosted GitLab, use:
- `http://localhost:3000/api/auth/callback/gitlab` (development)
- `https://your-depdash-domain.com/api/auth/callback/gitlab` (production)

---

## Testing OAuth Configuration

### 1. Verify Environment Variables

Make sure your `.env` file contains the OAuth credentials:

```bash
# Check if variables are set
grep "GOOGLE_CLIENT_ID\|GITHUB_CLIENT_ID\|GITLAB_CLIENT_ID" .env
```

### 2. Restart Development Server

```bash
npm run dev
```

### 3. Visit Login Page

Navigate to `http://localhost:3000/login`

You should see OAuth buttons for each configured provider:
- "Continue with Google" (if Google credentials are set)
- "Continue with GitHub" (if GitHub credentials are set)
- "Continue with GitLab" (if GitLab credentials are set)

### 4. Test Authentication Flow

1. Click on an OAuth button
2. Authorize the application in the provider's consent screen
3. You should be redirected back to DepDash and logged in

---

## Common Issues

### OAuth Button Not Showing

**Problem**: The OAuth button doesn't appear on the login page.

**Solution**:
- Ensure both `CLIENT_ID` and `CLIENT_SECRET` are set in `.env`
- Restart the development server after adding credentials
- Check for typos in environment variable names

### Redirect URI Mismatch

**Problem**: Error message about redirect URI mismatch.

**Solution**:
- Ensure the callback URL in your OAuth app settings matches exactly:
  - Protocol: `http://` or `https://`
  - Domain: `localhost:3000` or `your-domain.com`
  - Path: `/api/auth/callback/{provider}`
- No trailing slashes

### "Access Denied" Error

**Problem**: User sees "Access denied" after clicking OAuth button.

**Solution**:
- Check that the correct scopes are requested
- For GitLab: Ensure `read_user`, `openid`, `profile`, and `email` scopes are enabled
- For Google: Enable the Google+ API in your Google Cloud project
- For GitHub: No special permissions needed, but ensure the app isn't suspended

### User Not in Organization

**Problem**: User logs in successfully but can't access dashboard.

**Solution**:
- First-time OAuth users need to be manually added to an organization
- Have an admin create a user account and assign them to an organization
- Or implement automatic organization creation on first login (custom implementation)

---

## Security Best Practices

1. **Never commit credentials**: Keep `.env` file out of version control
2. **Use different credentials for dev/prod**: Create separate OAuth apps for each environment
3. **Rotate secrets regularly**: Update client secrets periodically
4. **Limit redirect URIs**: Only add necessary callback URLs
5. **Monitor OAuth usage**: Check your OAuth app's usage dashboard for suspicious activity

---

## Production Deployment

When deploying to production:

1. Create production OAuth apps with production callback URLs
2. Set environment variables in your hosting platform (Vercel, AWS, etc.)
3. Set `AUTH_TRUST_HOST=true` for production
4. Use HTTPS for all callback URLs
5. Test OAuth flow in production before going live

### Example Production Environment Variables

```env
# Production
NEXTAUTH_URL="https://depdash.your-company.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_TRUST_HOST="true"

# OAuth Providers (Production)
GOOGLE_CLIENT_ID="prod-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="prod-client-secret"
GITHUB_CLIENT_ID="prod-github-client-id"
GITHUB_CLIENT_SECRET="prod-github-client-secret"
GITLAB_CLIENT_ID="prod-gitlab-application-id"
GITLAB_CLIENT_SECRET="prod-gitlab-secret"
```

---

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps Guide](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitLab OAuth Applications](https://docs.gitlab.com/ee/integration/oauth_provider.html)
