import { BrowserRouter, Route, Routes, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { setAuthToken, setRefreshTokenFn, setLogoutFn } from './services/api';
import PageCin from './components/PageCin';
import ForbiddenPageCin from './components/ForbiddenPageCin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorScreen, httpErrors } from '@cincoders/cinnamon';
import { ALL_ROLES, Links, Roles } from './utils/enums';
import { ProfilePage } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import LoginPage from './pages/login';
import { MainLayout } from './layouts/MainLayout';

/**
 * Error boundary de nível de rota: um erro de renderização numa página mostra a
 * tela de erro padrão só naquela área, e `resetKey={pathname}` faz o boundary
 * se recuperar sozinho ao navegar para outra rota.
 */
function RouteErrorBoundary() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary label={`rota ${pathname}`} resetKey={pathname}>
      <Outlet />
    </ErrorBoundary>
  );
}


function RouteMap() {
  const auth = useAuth();
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading && !auth.activeNavigator && !hasCheckedSession.current) {
      hasCheckedSession.current = true;
      auth.signinSilent().catch(async (err) => {
        console.error('Session validation failed on load:', err);
        try {
          await auth.removeUser();
          await auth.clearStaleState();
        } catch {
          // ignore clean up error
        }
      });
    }
  }, [auth]);

  useEffect(() => {
    const refreshFn = async () => {
      try {
        console.log('Token expirado, tentando refresh silencioso...');
        const user = await auth.signinSilent();
        if (user) {
          setAuthToken(user.access_token);
          return user.access_token;
        }
      } catch (renewError) {
        console.error('Refresh silencioso falhou:', renewError);
      }
      return null;
    };

    setRefreshTokenFn(refreshFn);
    return () => {
      setRefreshTokenFn(null);
    };
  }, [auth]);

  useEffect(() => {
    const handleExpired = async () => {
      try {
        await auth.removeUser();
        await auth.clearStaleState();
      } catch {
        // ignore clean up error
      }
    };

    auth.events.addAccessTokenExpired(handleExpired);
    auth.events.addSilentRenewError(handleExpired);
    auth.events.addUserSignedOut(handleExpired);

    setLogoutFn(() => {
      void handleExpired();
    });

    return () => {
      auth.events.removeAccessTokenExpired(handleExpired);
      auth.events.removeSilentRenewError(handleExpired);
      auth.events.removeUserSignedOut(handleExpired);
      setLogoutFn(null);
    };
  }, [auth]);

  // Identifica o papel do utilizador logado para refletir na Navbar (ex: mostrar botão admin se for ADMIN)
  const userRole = 
    auth.user?.profile?.role === 'ADMIN' || 
    (auth.user?.profile?.roles as string[])?.includes('ADMIN') 
      ? 'ADMIN' 
      : 'ALUNO';

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Rota raiz /: se autenticado vai para /profile, caso contrário exibe tela de login */}
        <Route
          path={Links.HOME}
          element={
            auth.isAuthenticated ? (
              <Navigate to="/profile" replace />
            ) : (
              <LoginPage auth={auth} />
            )
          }
        />

        {/* Acesso negado: destino do redirect do RequireAuth (cinnamon). */}
        <Route path={Links.FORBIDDEN} element={<ForbiddenPageCin auth={auth} />} />

        {/* Rotas protegidas gerais (Perfil Institucional) abertas a qualquer usuário */}
        <Route element={<PageCin auth={auth} permittedRoles={ALL_ROLES} />}>
          <Route element={<RouteErrorBoundary />}>
            <Route 
              path="/profile" 
              element={
                <MainLayout>
                  <ProfilePage />
                </MainLayout>
              } 
            />
            <Route
              path="/profile/:email"
              element={
                <MainLayout>
                  <ProfilePage />
                </MainLayout>
              }
            />

            {/* Rota desconhecida: componente de erro pronto da cinnamon (404). */}
            <Route path="*" element={<ErrorScreen errorType={httpErrors.NOTFOUND_404} />} />
          </Route>
        </Route>

        {/* Rotas de gerenciamento — restritas apenas a ADMIN */}
        <Route element={<PageCin auth={auth} permittedRoles={[Roles.ADMIN]} />}>
          <Route element={<RouteErrorBoundary />}>
            <Route 
              path="/admin" 
              element={
                <MainLayout>
                  <AdminDashboard />
                </MainLayout>
              } 
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default RouteMap;