import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import EnterpriseAuthModal from './EnterpriseAuthModal';
import InternalCMS from './InternalCMS';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export default function DynamicCMSEntry() {
  const { cmsRoute } = useParams<{ cmsRoute: string }>();
  const [resolving, setResolving] = useState(true);
  const [isValidRoute, setIsValidRoute] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkRouteAndSession() {
      if (!cmsRoute) {
        setResolving(false);
        return;
      }

      try {
        // Step 1: Route resolution against server
        const routeRes = await api.resolveRoute(cmsRoute);
        if (!isMounted) return;

        if (routeRes.valid) {
          setIsValidRoute(true);
          // Step 2: Check for existing active server session
          try {
            const meRes = await api.getMe();
            if (meRes.user && isMounted) {
              setCurrentUser(meRes.user);
            }
          } catch {
            // No active session — will display authentication challenge
          }
        } else {
          setIsValidRoute(false);
        }
      } catch {
        if (isMounted) setIsValidRoute(false);
      } finally {
        if (isMounted) setResolving(false);
      }
    }

    checkRouteAndSession();
    return () => {
      isMounted = false;
    };
  }, [cmsRoute]);

  if (resolving) {
    return (
      <div className="min-h-screen bg-[#07080a] text-ink flex items-center justify-center">
        <div className="flex items-center gap-3 text-xs text-text-secondary font-mono">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>Verifying secure route boundary...</span>
        </div>
      </div>
    );
  }

  // If route does NOT match active cryptographic identifier -> Render generic 404 (Fail closed)
  if (!isValidRoute) {
    return (
      <div className="min-h-screen bg-[#07080a] text-ink flex items-center justify-center px-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-heading font-bold text-6xl text-primary">404</h1>
          <h2 className="font-heading font-semibold text-xl text-ink">Page Not Found</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            The resource you requested could not be located on the server. Please verify the URL or return to the main landing page.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface border border-border text-xs text-ink font-medium transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If valid route, require authentication challenge or render CMS
  if (!currentUser) {
    return <EnterpriseAuthModal onAuthenticated={(user) => setCurrentUser(user)} />;
  }

  return (
    <InternalCMS
      currentUser={currentUser}
      onLogout={() => {
        api.logout().catch(() => {});
        setCurrentUser(null);
      }}
    />
  );
}
