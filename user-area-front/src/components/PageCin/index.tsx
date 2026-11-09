import { PageWithAuth } from "@cincoders/cinnamon";
import { Outlet, Navigate } from "react-router-dom";
import type { AuthContextProps } from "react-oidc-context";
import { Links } from "../../utils/enums";
import { version as appVersion } from "../../../package.json";
import { AppNavbar } from "./AppNavbar";

interface PageCinProps {
  auth: AuthContextProps;
  permittedRoles: string[];
  children?: JSX.Element | JSX.Element[];
}

export default function PageCin({ auth, permittedRoles, children }: PageCinProps) {
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to={Links.HOME} replace />;
  }

  return (
    <PageWithAuth
      authProps={{ auth, permittedRoles, publicURL: "" }}
      
      // Utiliza o cinnamon de base, mas a navbar é própria.
      // A navbar do cinnamon é muito limitada.
      components={{ navbar: <AppNavbar auth={auth} /> }}
      footer={{
        variant: "cin",
        appVersion,
      }}
      centralized={false}
      haveToast={false}
    >
      {children ?? <Outlet />}
    </PageWithAuth>
  );
}