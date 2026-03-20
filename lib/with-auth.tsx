import { Resource } from "./permissions";
import { requireViewAccess, requireEditAccess, AuthContext } from "./auth-utils";

export type PageProps = {
  authContext: AuthContext;
};

/**
 * HOC to protect pages with VIEW access requirement
 * Usage: export default withViewAccess("vulnerabilities", YourPage);
 */
export function withViewAccess<P extends PageProps>(
  resource: Resource,
  Component: React.ComponentType<P>
) {
  return async function ProtectedPage(props: Omit<P, "authContext">) {
    const authContext = await requireViewAccess(resource);

    return <Component {...(props as P)} authContext={authContext} />;
  };
}

/**
 * HOC to protect pages with EDIT access requirement
 * Usage: export default withEditAccess("settings", YourPage);
 */
export function withEditAccess<P extends PageProps>(
  resource: Resource,
  Component: React.ComponentType<P>
) {
  return async function ProtectedPage(props: Omit<P, "authContext">) {
    const authContext = await requireEditAccess(resource);

    return <Component {...(props as P)} authContext={authContext} />;
  };
}
