import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, AlertCircle, CheckCircle, Edit, Trash2, Lock } from 'lucide-react';
import { performanceMeasures } from '../lib/api';
import { useLanguage } from '../lib/i18n/LanguageContext';
import type { PerformanceMeasure } from '../types/organization';
import { auth } from '../lib/api';
import { isPlanner } from '../types/user';

interface PerformanceMeasureListProps {
  initiativeId: string;
  onEditMeasure: (measure: PerformanceMeasure) => void;
  onDeleteMeasure: (measureId: string) => void;
}

const PerformanceMeasureList: React.FC<PerformanceMeasureListProps> = ({ 
  initiativeId, 
  onEditMeasure,
  onDeleteMeasure
}) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isUserPlanner, setIsUserPlanner] = React.useState(false);
  
  // Fetch current user role
  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authData = await auth.getCurrentUser();
        setIsUserPlanner(isPlanner(authData.userOrganizations));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    
    fetchUserData();
  }, []);
  
  const { data: weightSummary } = useQuery({
    queryKey: ['performance-measures', 'weight-summary', initiativeId],
    queryFn: () => performanceMeasures.getWeightSummary(initiativeId),
  });

  const { data: measuresList, isLoading } = useQuery({
    queryKey: ['performance-measures', initiativeId],
    queryFn: () => performanceMeasures.getByInitiative(initiativeId),
  });

  const validateMeasuresMutation = useMutation({
    mutationFn: () => performanceMeasures.validateMeasuresWeight(initiativeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-measures', 'weight-summary', initiativeId] });
    }
  });

  if (isLoading) {
    return <div className="text-center p-4">{t('common.loading')}</div>;
  }

  if (!measuresList?.data) {
    return <div className="text-center p-4 text-gray-500">No performance measures found</div>;
  }

  const { 
    initiative_weight = 0,
    expected_measures_weight = 35,
    total_measures_weight = 0, 
    remaining_weight = 35, 
    is_valid = false 
  } = weightSummary?.data || {};

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t('planning.weightDistribution')}
          </h3>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Initiative Weight</p>
            <p className="text-2xl font-semibold text-gray-900">{initiative_weight}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('planning.allocatedWeight')}</p>
            <p className="text-2xl font-semibold text-blue-600">{total_measures_weight}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('planning.remainingWeight')}</p>
            <p className={`text-2xl font-semibold ${remaining_weight === 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {remaining_weight}%
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> The total weight of performance measures must equal 35% of the initiative weight.
          </p>
        </div>

        {remaining_weight < 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{t('planning.overAllocatedWarning')}</p>
          </div>
        )}

        {remaining_weight > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              {t('planning.measuresNotValid')}. Current total: {total_measures_weight}%, Expected: {expected_measures_weight}%
            </p>
          </div>
        )}

        {remaining_weight === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm">
              {t('planning.measuresValidated')}
            </p>
          </div>
        )}

        {isUserPlanner && (
          <div className="mt-4">
            <button
              onClick={() => validateMeasuresMutation.mutate()}
              disabled={validateMeasuresMutation.isPending}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {validateMeasuresMutation.isPending ? t('planning.validatingMeasures') : t('planning.validateMeasures')}
            </button>
            
            {validateMeasuresMutation.isError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {(validateMeasuresMutation.error as any)?.response?.data?.message || 
                  'Failed to validate measures weight'}
              </div>
            )}
            
            {validateMeasuresMutation.isSuccess && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                {validateMeasuresMutation.data?.data?.message || t('planning.measuresValidated')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {measuresList.data.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No performance measures yet. {isUserPlanner ? 'Create one to get started.' : ''}
          </div>
        ) : (
          measuresList.data.map((measure) => (
            <div
              key={measure.id}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{measure.name}</h4>
                <span className="text-sm font-medium text-blue-600">
                  {measure.weight}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                <div>
                  <span className="text-gray-500">Baseline:</span> 
                  <span className="ml-2">{measure.baseline || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Annual Target:</span> 
                  <span className="ml-2 font-medium">{measure.annual_target}</span>
                </div>
                <div>
                  <span className="text-gray-500">Q1:</span> 
                  <span className="ml-2">{measure.q1_target}</span>
                </div>
                <div>
                  <span className="text-gray-500">Q2:</span> 
                  <span className="ml-2">{measure.q2_target}</span>
                </div>
                <div>
                  <span className="text-gray-500">Q3:</span> 
                  <span className="ml-2">{measure.q3_target}</span>
                </div>
                <div>
                  <span className="text-gray-500">Q4:</span> 
                  <span className="ml-2">{measure.q4_target}</span>
                </div>
              </div>
              
              {isUserPlanner && (
                <div className="flex justify-end space-x-2 mt-3">
                  <button
                    onClick={() => onEditMeasure(measure)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteMeasure(measure.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {!isUserPlanner && (
                <div className="flex justify-end mt-3">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Lock className="h-3 w-3 mr-1" />
                    {t('planning.permissions.readOnly')}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PerformanceMeasureList;