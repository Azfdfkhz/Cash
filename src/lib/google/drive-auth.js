import { google } from "googleapis";
import { getGoogleAuth } from "./auth";

let cachedAuth = null;

/**
 * Google Drive authentication.
 *
 * For a personal Google Drive, use OAuth 2.0 with a refresh token.
 * If OAuth variables are not configured, fall back to the existing
 * service-account authentication so shared/team deployments remain compatible.
 */
export function getDriveAuth() {
  if (cachedAuth) return cachedAuth;

  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    cachedAuth = oauth2Client;
    return cachedAuth;
  }

  // Backward-compatible fallback for the shared/team setup.
  cachedAuth = getGoogleAuth();
  return cachedAuth;
}
