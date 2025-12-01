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
      {/* Fallback custom button removed as per user request */}
    </div>
  );
};

