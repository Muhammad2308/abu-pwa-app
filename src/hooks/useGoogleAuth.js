import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../App';

/**
 * Google Sign-In button component using Google Identity Services
 * This component uses the Google Identity Services library directly
 * to get ID tokens for backend authentication
 */
export const GoogleSignInButton = ({ onSuccess, onError, text = 'Sign in with Google', disabled = false }) => {
  const buttonRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Wait for Google Identity Services to load
    const initializeGoogle = () => {
      if (window.google && window.google.accounts && buttonRef.current && !isInitialized.current) {
        try {
          // Log current origin for debugging
          const currentOrigin = window.location.origin;
          console.log('Google OAuth - Current origin:', currentOrigin);
          console.log('Google OAuth - Full URL:', window.location.href);
          console.log('Google OAuth - Client ID:', GOOGLE_CLIENT_ID);
          
          // Check if origin matches expected patterns
          const expectedOrigins = [
            'http://localhost:3000',
            'https://abu-endowment-mobile.vercel.app',
            'http://localhost:3001',
            'http://localhost:5173', // Vite default
            'http://localhost:8080',
          ];
          
          if (!expectedOrigins.includes(currentOrigin)) {
            console.warn('Google OAuth - Origin not in expected list:', currentOrigin);
            console.warn('Google OAuth - Please add this origin to Google Cloud Console:');
            console.warn(`  ${currentOrigin}`);
          }
          
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              if (response.credential) {
                // Success - credential contains the ID token
                if (onSuccess) {
                  onSuccess(response.credential);
                }
              } else {
                // Error
                if (onError) {
                  onError(new Error('Failed to get Google credential'));
                }
              }
            },
          });

          // Render the Google button
          // Get the container width for proper sizing (wait a bit for layout)
          setTimeout(() => {
            if (buttonRef.current && window.google?.accounts?.id) {
              try {
                // Get actual pixel width of container
                const containerWidth = buttonRef.current.offsetWidth;
                
                // Ensure we have a valid width (minimum 200px, maximum 400px)
                const buttonWidth = containerWidth > 0 ? Math.min(Math.max(containerWidth, 200), 400) : 300;
                
                console.log('Google Button - Container width:', containerWidth, 'Button width:', buttonWidth);
                
                window.google.accounts.id.renderButton(buttonRef.current, {
                  theme: 'outline',
                  size: 'large',
                  text: text.includes('Register') ? 'signup_with' : 'signin_with',
                  width: buttonWidth, // Use pixel value, not percentage
                  shape: 'rectangular',
                  logo_alignment: 'left',
                });
              } catch (renderError) {
                console.warn('Google button render error:', renderError);
                // If render fails, show fallback button
                isInitialized.current = false;
              }
            }
          }, 100);

          isInitialized.current = true;
        } catch (error) {
          console.error('Google button initialization error:', error);
          if (onError) {
            onError(error);
          }
        }
      } else if (!window.google || !window.google.accounts) {
        // Retry after a short delay if Google script hasn't loaded
        setTimeout(initializeGoogle, 100);
      }
    };

    initializeGoogle();
  }, [onSuccess, onError, text]);

  const handleClick = () => {
    if (disabled) return;

    if (!window.google || !window.google.accounts) {
      if (onError) {
        onError(new Error('Google Identity Services not loaded. Please refresh the page.'));
      }
      return;
    }

    // Trigger the sign-in flow programmatically
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            if (onSuccess) {
              onSuccess(response.credential);
            }
          } else {
            if (onError) {
              onError(new Error('Failed to get Google credential'));
            }
          }
        },
      });

      // Prompt for sign-in
      window.google.accounts.id.prompt();
    } catch (error) {
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Google will render the button here */}
      {/* Use a fixed width container to avoid 100% width issue */}
      <div ref={buttonRef} style={{ width: '100%', minWidth: '200px', maxWidth: '400px' }}></div>
      
      {/* Fallback custom button if Google button doesn't render */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mt-2"
        style={{ display: isInitialized.current ? 'none' : 'flex' }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>{text}</span>
      </button>
    </div>
  );
};

