import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Target, List, FileText } from 'lucide-react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { auth } from '../lib/api';
import LanguageSwitch from '../components/LanguageSwitch';

const Landing: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authData = await auth.checkAuth();
        const isAuthenticated = Boolean(authData?.isAuthenticated);
        if (isAuthenticated) {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Handle error silently and stay on landing page
      }
    };
    
    checkAuth();
  }, [navigate]);

  const features = [
    {
      name: t('landing.features.orgStructure.title'),
      description: t('landing.features.orgStructure.description'),
      icon: Users,
    },
    {
      name: t('landing.features.strategicPlanning.title'),
      description: t('landing.features.strategicPlanning.description'),
      icon: Target,
    },
    {
      name: t('landing.features.teamManagement.title'),
      description: t('landing.features.teamManagement.description'),
      icon: FileText,
    },
    {
      name: t('landing.features.metadataManagement.title'),
      description: t('landing.features.metadataManagement.description'),
      icon: List,
    },
  ];

  return (
    <div className="bg-white">
      <header className="relative bg-blue-700">
        <div className="absolute top-4 right-4">
          <LanguageSwitch />
        </div>
        <div className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src="/assets/moh-logo.png" 
                alt="Ministry of Health Ethiopia"
                className="h-24 w-auto"
              />
            </div>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
              {t('landing.title')}
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-blue-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              {t('landing.subtitle')}
            </p>
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10"
              >
                {t('landing.getStarted')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              {t('landing.everythingYouNeed')}
            </h2>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.name} className="pt-6">
                  <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                    <div className="-mt-6">
                      <div>
                        <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                          <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </span>
                      </div>
                      <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                        {feature.name}
                      </h3>
                      <p className="mt-5 text-base text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;