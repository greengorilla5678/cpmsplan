import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../lib/api';
import { useLanguage } from '../lib/i18n/LanguageContext';

const AuthLayout: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    // Check if user is already authenticated
    if (auth.isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('app.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('app.subtitle')}
        </p>
      </div>
      <Outlet />
    </div>
  );
};

export default AuthLayout;