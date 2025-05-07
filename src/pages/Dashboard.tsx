import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizations } from '../lib/api';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Info, LayoutList, Network } from 'lucide-react';
import OrganizationTree from '../components/OrganizationTree';
import OrganizationChart from '../components/OrganizationChart';
import MetadataForm from '../components/MetadataForm';
import type { Organization } from '../types/organization';

function Dashboard() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'tree' | 'chart'>('tree');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Fetch organizations data
  const { data: orgData, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizations.getAll().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-red-600">{t('common.error')}</div>
      </div>
    );
  }

  // Make sure we have organization data
  if (!orgData || orgData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-red-600">No organizations found</div>
      </div>
    );
  }

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrg(org);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.orgStructure')}</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setViewMode('tree')}
                  className={`p-2 rounded-md ${viewMode === 'tree' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  title="Tree View"
                >
                  <LayoutList size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('chart')}
                  className={`p-2 rounded-md ${viewMode === 'chart' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  title="Organogram View"
                >
                  <Network size={18} />
                </button>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {viewMode === 'tree' ? (
                <OrganizationTree 
                  data={orgData} 
                  onSelectOrganization={handleSelectOrganization}
                  selectedOrgId={selectedOrg?.id}
                />
              ) : (
                <OrganizationChart data={orgData} />
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('dashboard.metadata')}</h2>
            
            {!selectedOrg ? (
              <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg mb-2">{t('dashboard.selectOrgPrompt')}</p>
                <p className="text-sm">{t('dashboard.noOrganizations')}</p>
              </div>
            ) : (
              <MetadataForm organization={selectedOrg} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;