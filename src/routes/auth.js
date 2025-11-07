// Authentication routes using Passport.js and Google OAuth

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { verifyDomain } from '../middleware/auth.js';

const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID;
const AUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET;
const AUTH_CALLBACK_URL = process.env.AUTH_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

/**
 * Configure Passport with Google OAuth strategy
 * This is used ONLY for authentication, not for calendar access
 */
export function configurePassport() {
  if (!AUTH_CLIENT_ID || !AUTH_CLIENT_SECRET) {
    console.warn('⚠️  AUTH_CLIENT_ID and AUTH_CLIENT_SECRET not set. Authentication will not work.');
    console.warn('   Set BYPASS_AUTH=true for development without authentication.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: AUTH_CLIENT_ID,
        clientSecret: AUTH_CLIENT_SECRET,
        callbackURL: AUTH_CALLBACK_URL,
        scope: ['profile', 'email'], // Only request profile and email, NOT calendar access
      },
      (accessToken, refreshToken, profile, done) => {
        // Extract user information
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(null, false, { message: 'No email found in Google profile' });
        }

        // Verify domain (case-sensitive)
        if (!verifyDomain(email)) {
          console.log(`❌ Access denied for: ${email} (invalid domain)`);
          return done(null, false, { message: 'Access restricted to @brown.edu accounts only' });
        }

        // User is valid
        console.log(`✅ Authentication successful: ${email}`);
        
        const user = {
          id: profile.id,
          email: email,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        };

        return done(null, user);
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}

/**
 * Create authentication routes
 */
export function createAuthRoutes(app) {
  // Initiate Google OAuth flow
  app.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account', // Force account selection
    })
  );

  // OAuth callback route
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/login.html?error=auth_failed',
      failureMessage: true,
    }),
    (req, res) => {
      // Successful authentication
      // Redirect to the page they originally wanted, or home
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(returnTo);
    }
  );

  // Logout route
  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      req.session.destroy(() => {
        res.redirect('/login.html?logged_out=true');
      });
    });
  });

  // Check authentication status (for frontend)
  app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        authenticated: true,
        user: {
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
        },
      });
    } else {
      res.json({
        authenticated: false,
      });
    }
  });
}
