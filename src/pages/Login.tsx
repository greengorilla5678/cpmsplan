import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Home, AlertCircle } from 'lucide-react';
import { auth } from '../lib/api';
import { useLanguage } from '../lib/i18n/LanguageContext';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { isAuthenticated } = await auth.checkAuth();
        if (isAuthenticated && window.location.pathname === '/login') {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsInitialCheck(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Don't render form while checking initial auth status
  if (isInitialCheck) {
    return null;
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoginError(null);
      const response = await auth.login(data.username, data.password);
      
      if (response.success) {
        // Refresh auth state and redirect
        const { isAuthenticated } = await auth.checkAuth();
        if (isAuthenticated) {
          navigate('/dashboard');
        } else {
          setLoginError(t('auth.loginFailed'));
        }
      } else {
        setLoginError(response.error || t('auth.loginFailed'));
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(t('auth.loginFailed'));
    }
  };

  return (
    <>
      <div className="absolute top-4 left-4">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 bg-white/80 backdrop-blur rounded-md hover:bg-white transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>{t('common.home')}</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/assets/moh-logo.png"
            alt="Ministry of Health"
            className="mx-auto h-24 w-auto"
          />
        </div>

        <form className="space-y-6 bg-white p-8 rounded-lg shadow-sm" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              {t('auth.username')}
            </label>
            <div className="mt-1">
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                {...register('username', { required: t('auth.usernameRequired') })}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('auth.username')}
              />
              {errors.username && (
                <p className="mt-2 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('auth.password')}
            </label>
            <div className="mt-1">
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                {...register('password', { required: t('auth.passwordRequired') })}
                placeholder={t('auth.password')}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{loginError}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('auth.signingIn') : t('auth.login')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Login;