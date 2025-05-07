import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import { Loader } from 'lucide-react';

// Lazy load components
const AuthLayout = React.lazy(() => import('./components/AuthLayout'));
const DashboardLayout = React.lazy(() => import('./components/DashboardLayout'));

const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Planning = React.lazy(() => import('./pages/Planning'));
const PlanSummary = React.lazy(() => import('./pages/PlanSummary'));
const EvaluatorDashboard = React.lazy(() => import('./pages/EvaluatorDashboard'));

// Create QueryClient with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
      suspense: false
    }
  }
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex items-center space-x-2 text-gray-600">
      <Loader className="h-6 w-6 animate-spin" />
      <span className="text-lg">Loading...</span>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              
              {/* Auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
              </Route>
              
              {/* Protected routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/plans/:planId" element={<PlanSummary />} />
                
                <Route path="/evaluator" element={<EvaluatorDashboard />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <ReactQueryDevtools />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;