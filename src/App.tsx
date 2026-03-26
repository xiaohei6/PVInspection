import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import WorkOrderListPage from './pages/WorkOrderListPage';
import WorkOrderFormPage from './pages/WorkOrderFormPage';
import WorkOrderDetailPage from './pages/WorkOrderDetailPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminInspectionItemsPage from './pages/AdminInspectionItemsPage';

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// 管理后台路由
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <WorkOrderListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <WorkOrderFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit/:id"
        element={
          <ProtectedRoute>
            <WorkOrderFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/detail/:id"
        element={
          <ProtectedRoute>
            <WorkOrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <AdminOrdersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/inspection-items"
        element={
          <AdminRoute>
            <AdminInspectionItemsPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-100">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;