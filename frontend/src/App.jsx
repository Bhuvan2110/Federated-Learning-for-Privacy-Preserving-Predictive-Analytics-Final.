import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Training from './pages/Training';
import Predict from './pages/Predict';
import Sidebar from './components/Sidebar';

const Layout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">
      {children}
    </main>
  </div>
);

/**
 * PrivateRoute — checks localStorage on EVERY render.
 * This is the critical fix: using a plain `const isAuthenticated` inside App()
 * only evaluates once at mount, so after login (token saved → navigate) the
 * parent component doesn't re-render and the redirect back to /login fires.
 * By moving the check into a child component, it re-evaluates on every
 * route change, correctly allowing access after the token is stored.
 */
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* All protected routes — token checked fresh on every render */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/datasets" element={<Datasets />} />
                  <Route path="/training" element={<Training />} />
                  <Route path="/predict" element={<Predict />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
