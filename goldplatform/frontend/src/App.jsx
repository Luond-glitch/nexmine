import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ResetPage from "./pages/ResetPage.jsx";
import StoryModeration from "./pages/StoryModeration.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminContent from "./pages/AdminContent.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useAuth } from "./lib/auth.jsx";

function Guard({ role, children }) {          // UI convenience only; the API enforces the real permission
  const { user } = useAuth();
  if (user === undefined) return <p className="p-8">Loading…</p>;
  return user && user.role === role ? children : <Navigate to={`/auth/${role}`} replace />;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <div key={pathname.split("/")[1]} className="page">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/:portal" element={<AuthPage />} />
        <Route path="/reset" element={<ResetPage />} />
        {["miner", "expert", "researcher"].map((r) => (
          <Route key={r} path={`/${r}/*`} element={<Guard role={r}><Dashboard portal={r} /></Guard>} />
        ))}
        <Route path="/admin/overview" element={<Guard role="admin"><AdminUsers /></Guard>} />
        <Route path="/admin/content" element={<Guard role="admin"><AdminContent /></Guard>} />
        <Route path="/admin/stories" element={<Guard role="admin"><StoryModeration /></Guard>} />
        <Route path="/admin" element={<Guard role="admin"><AdminDashboard /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
