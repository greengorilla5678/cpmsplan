import React from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import type { Organization } from '../types/organization';

interface MetadataFormProps {
  organization: Organization;
}

const MetadataForm: React.FC<MetadataFormProps> = ({ organization }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.vision')}</h3>
        <div className="bg-gray-50 rounded-md p-4 text-gray-900">
          {organization.vision || <span className="text-gray-500 italic">No vision statement provided</span>}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.mission')}</h3>
        <div className="bg-gray-50 rounded-md p-4 text-gray-900">
          {organization.mission || <span className="text-gray-500 italic">No mission statement provided</span>}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t('dashboard.coreValues')}</h3>
        <div className="bg-gray-50 rounded-md p-4">
          {organization.core_values && organization.core_values.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-gray-900">
              {organization.core_values.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-500 italic">No core values provided</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetadataForm;