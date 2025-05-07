import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, LogOut, LayoutDashboard, FileSpreadsheet, Activity, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { auth } from '../lib/api';
import LanguageSwitch from './LanguageSwitch';
import { AuthState, isAdmin, isPlanner, isEvaluator } from '../types/user';

const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authData = await auth.getCurrentUser();
        setAuthState(authData);
        
        if (!authData.isAuthenticated) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({ isAuthenticated: false });
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Show loading state while checking authentication
  if (authState === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authState.isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await auth.logout();
      // The redirect is handled in the logout function
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-green-700 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <Activity className="h-8 w-8 text-white" />
                <span className="ml-2 text-xl font-semibold text-white">MoH CPR</span>
              </Link>
              
              <div className="ml-10 flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/dashboard')
                      ? 'text-white bg-green-800'
                      : 'text-green-100 hover:text-white hover:bg-green-600'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5 mr-2" />
                  {t('nav.dashboard')}
                </Link>
                
                {/* Only show planning link to planners */}
                {isPlanner(authState.userOrganizations) && (
                  <Link
                    to="/planning"
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/planning')
                        ? 'text-white bg-green-800'
                        : 'text-green-100 hover:text-white hover:bg-green-600'
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    {t('nav.planning')}
                  </Link>
                )}
                
                {/* View-only planning link for admins */}
                {isAdmin(authState.userOrganizations) && !isPlanner(authState.userOrganizations) && (
                  <Link
                    to="/planning"
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/planning')
                        ? 'text-white bg-green-800'
                        : 'text-green-100 hover:text-white hover:bg-green-600'
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    {t('nav.viewPlans')}
                  </Link>
                )}

                {/* Evaluator Dashboard link */}
                {isEvaluator(authState.userOrganizations) && (
                  <Link
                    to="/evaluator"
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/evaluator')
                        ? 'text-white bg-green-800'
                        : 'text-green-100 hover:text-white hover:bg-green-600'
                    }`}
                  >
                    <ClipboardCheck className="h-5 w-5 mr-2" />
                    {t('nav.evaluator')}
                  </Link>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {authState.user && (
                <div className="text-green-100 px-3 py-2">
                  <span className="text-sm font-medium">
                    {authState.user.first_name || authState.user.username}
                  </span>
                  {authState.userOrganizations && authState.userOrganizations.length > 0 && (
                    <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded-full">
                      {authState.userOrganizations[0].role}
                    </span>
                  )}
                </div>
              )}
              <LanguageSwitch />
              <a
                href="/admin/"
                target="_blank"
                className="text-green-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('nav.adminPanel')}
              </a>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center text-green-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span>{isLoggingOut ? t('common.loading') : t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Powered by Information Communication Technology EO, 2025
            </div>
            <div className="text-sm text-gray-500">
              Ministry of Health, Ethiopia
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;