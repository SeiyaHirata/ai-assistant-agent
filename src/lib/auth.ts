import { OAuth2Client } from 'google-auth-library';

export const createGoogleAuthClient = (token: string): OAuth2Client => {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: token
  });

  return oauth2Client;
};
