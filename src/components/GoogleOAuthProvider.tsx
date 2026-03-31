import { GoogleOAuthProvider } from '@react-oauth/google';

// Google Client ID for NeuroHire AI
const GOOGLE_CLIENT_ID = '350713133141-br0vv28l85i8jm1ir5d66lmt2u8edibr.apps.googleusercontent.com';

export const GoogleAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
};
