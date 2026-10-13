import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import { api } from "./api";
import Pay42DashboardPage from "../modules/42pay/pages/Pay42DashboardPage";
import Pay42ProductsPage from "../modules/42pay/pages/Pay42ProductsPage";
import Pay42OffersPage from "../modules/42pay/pages/Pay42OffersPage";
import Pay42OfferPaymentPage from "../modules/42pay/pages/Pay42OfferPaymentPage";
import Pay42OrdersPage from "../modules/42pay/pages/Pay42OrdersPage";
import Pay42AdminUsersPage from "../modules/42pay/pages/Pay42AdminUsersPage";
import Pay42ScanPage from "../modules/42pay/pages/Pay42ScanPage";
import Pay42TopupPage from "../modules/42pay/pages/Pay42TopupPage";
import Pay42PurchaseConfirmationPage from "../modules/42pay/pages/Pay42PurchaseConfirmationPage";
import LoginPage from "../modules/system/pages/LoginPage";
import ProfilePage from "../modules/system/pages/ProfilePage";
import UsersPage from "../modules/system/pages/UsersPage";
import ToastContainer from "../shared/components/ToastContainer";
import { ConfirmDialogProvider } from "../shared/components/ConfirmDialog";

const routeAccess = {
  "/admin/42pay/products": ["admin", "seller"],
  "/admin/42pay/scan": ["admin", "buyer"],
  "/admin/42pay/topup": ["admin", "buyer"],
  "/admin/42pay/admin/users": ["admin"],
  "/system/users": ["admin"],
};

function rolesOf(user) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function canOpen(user, path) {
  const allowed = routeAccess[path];
  if (!allowed) return Boolean(user);
  return rolesOf(user).some((role) => allowed.includes(role));
}

function homePath(user) {
  return user ? "/admin/42pay/dashboard" : "/login";
}

function Protected({ user, path, children }) {
  if (!user) return <Navigate to={`/login?return_url=${encodeURIComponent(path)}`} replace />;
  if (!canOpen(user, path)) return <Navigate to={homePath(user)} replace />;
  return children;
}

function LegacyConfirmationRedirect() {
  const { orderSid } = useParams();
  return <Navigate to={`/admin/42pay/orders/${orderSid || ""}/confirmation`} replace />;
}

function Header({ user, onLogout }) {
  const links = useMemo(() => {
    const rows = [
      ["Dashboard", "/admin/42pay/dashboard"],
      ["Products", "/admin/42pay/products"],
      ["Offers", "/admin/42pay/offers"],
      ["Scan", "/admin/42pay/scan"],
      ["Orders", "/admin/42pay/orders"],
      ["Top Up", "/admin/42pay/topup"],
      ["Pay Users", "/admin/42pay/admin/users"],
      ["Users", "/system/users"],
      ["Profile", "/settings/profile"],
    ];
    return rows.filter(([, path]) => canOpen(user, path));
  }, [user]);
  return (
    <header className="app-header">
      <Link className="brand" to={homePath(user)}>
        <img src="/logo/payhub-p-final.png" alt="PayHub" />
        <span>xtravel84</span>
      </Link>
      <nav className="app-nav" aria-label="Primary">
        {links.map(([label, path]) => (
          <NavLink key={path} to={path} className={({ isActive }) => (isActive ? "active" : "")}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="app-user">
        <span>{user?.name}</span>
        <button type="button" className="secondary-button" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    api.authMe().then((out) => {
      if (active) setUser(out?.user || null);
    }).catch(() => {
      if (active) setUser(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
  }

  if (loading) return <div className="loading-container">Loading xtravel84…</div>;
  const loginRoute = location.pathname === "/login";

  return (
    <ConfirmDialogProvider>
      {!loginRoute && user ? <Header user={user} onLogout={logout} /> : null}
      <main className={loginRoute ? "login-main" : "app-main"}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={homePath(user)} replace /> : <LoginPage onLogin={setUser} />} />
          <Route path="/admin/42pay/dashboard" element={<Protected user={user} path="/admin/42pay/dashboard"><Pay42DashboardPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/products" element={<Protected user={user} path="/admin/42pay/products"><Pay42ProductsPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/products/:productSid" element={<Protected user={user} path="/admin/42pay/products"><Pay42ProductsPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/offers" element={<Protected user={user} path="/admin/42pay/offers"><Pay42OffersPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/offers/:sid/pay" element={<Protected user={user} path="/admin/42pay/offers"><Pay42OfferPaymentPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/scan" element={<Protected user={user} path="/admin/42pay/scan"><Pay42ScanPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/orders" element={<Protected user={user} path="/admin/42pay/orders"><Pay42OrdersPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/orders/:orderSid/confirmation" element={<Protected user={user} path="/admin/42pay/orders"><Pay42PurchaseConfirmationPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/topup" element={<Protected user={user} path="/admin/42pay/topup"><Pay42TopupPage authUser={user} /></Protected>} />
          <Route path="/admin/42pay/admin/users" element={<Protected user={user} path="/admin/42pay/admin/users"><Pay42AdminUsersPage authUser={user} /></Protected>} />
          <Route path="/settings/profile" element={<Protected user={user} path="/settings/profile"><ProfilePage authUser={user} onUserUpdate={setUser} /></Protected>} />
          <Route path="/system/users" element={<Protected user={user} path="/system/users"><UsersPage /></Protected>} />
          <Route path="/42pay/orders/:orderSid/confirmation" element={<LegacyConfirmationRedirect />} />
          <Route path="/" element={<Navigate to={homePath(user)} replace />} />
          <Route path="*" element={<Navigate to={homePath(user)} replace />} />
        </Routes>
      </main>
      <ToastContainer />
    </ConfirmDialogProvider>
  );
}
