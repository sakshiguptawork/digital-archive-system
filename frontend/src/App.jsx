import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { getDashboardRoute, useAuth } from './context/AuthContext';
import ArchivistDashboard from './pages/ArchivistDashboard';
import LoginPage from './pages/LoginPage';
import PublicDashboard from './pages/PublicDashboard';
import RegisterPage from './pages/RegisterPage';
import ResearcherDashboard from './pages/ResearcherDashboard';

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDashboardRoute(user.role)} replace />;
};

const DashboardLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="page-container">{children}</main>
  </>
);

function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/login"
        element={
          isAuthenticated && user ? (
            <Navigate to={getDashboardRoute(user.role)} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated && user ? (
            <Navigate to={getDashboardRoute(user.role)} replace />
          ) : (
            <RegisterPage />
          )
        }
      />

      <Route
        path="/archivist"
        element={
          <ProtectedRoute allowedRoles={['archivist']}>
            <DashboardLayout>
              <ArchivistDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/researcher"
        element={
          <ProtectedRoute allowedRoles={['researcher']}>
            <DashboardLayout>
              <ResearcherDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/public"
        element={
          <ProtectedRoute allowedRoles={['public']}>
            <DashboardLayout>
              <PublicDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
