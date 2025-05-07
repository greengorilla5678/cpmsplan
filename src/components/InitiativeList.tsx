import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { initiatives } from '../lib/api';
import { BarChart3, AlertCircle, CheckCircle, Edit, Trash2, Lock, PlusCircle } from 'lucide-react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import type { StrategicInitiative } from '../types/organization';
import { auth } from '../lib/api';
import { isPlanner } from '../types/user';

interface InitiativeListProps {
  parentId: string;
  parentType: 'objective' | 'program' | 'subprogram';
  onEditInitiative: (initiative: StrategicInitiative) => void;
  onSelectInitiative?: (initiative: StrategicInitiative) => void;
  isNewPlan?: boolean;
  planKey?: string; // Add plan key to force refresh
  showTodayOnly?: boolean; // New prop to show only today's initiatives
}

const InitiativeList: React.FC<InitiativeListProps> = ({ 
  parentId,
  parentType,
  onEditInitiative,
  onSelectInitiative,
  isNewPlan = false,
  planKey = 'default',
  showTodayOnly = true // Default to showing only today's initiatives
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

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];

  // Fetch weight summary based on parent type
  const { data: weightSummary } = useQuery({
    queryKey: ['initiatives', 'weight-summary', parentId, parentType, isNewPlan ? 'new' : 'existing', planKey],
    queryFn: () => initiatives.getWeightSummary(parentId, parentType),
    enabled: !isNewPlan, // Only fetch weight summary for existing plans
    staleTime: 0, // Don't cache
    cacheTime: 0 // Don't cache at all
  });

  // Fetch initiatives based on parent type
  const { data: initiativesList, isLoading } = useQuery({
    queryKey: ['initiatives', parentId, parentType, isNewPlan ? 'new' : 'existing', planKey, showTodayOnly ? 'today' : 'all'],
    queryFn: async () => {
      // If this is a new plan, don't fetch any initiatives, return empty array
      if (isNewPlan) {
        console.log('New plan: returning empty initiatives list');
        return { data: [] };
      }
      
      // Otherwise, fetch initiatives based on parent type
      console.log(`Fetching initiatives for ${parentType} ${parentId}`);
      let response;
      switch (parentType) {
        case 'objective':
          response = await initiatives.getByObjective(parentId, showTodayOnly ? today : undefined);
          break;
        case 'program':
          response = await initiatives.getByProgram(parentId, showTodayOnly ? today : undefined);
          break;
        case 'subprogram':
          response = await initiatives.getBySubProgram(parentId, showTodayOnly ? today : undefined);
          break;
        default:
          throw new Error('Invalid parent type');
      }

      return response;
    },
    staleTime: 0, // Don't cache the data
    cacheTime: 0,  // Don't cache the data at all
  });

  const validateInitiativesMutation = useMutation({
    mutationFn: () => initiatives.validateInitiativesWeight(parentId, parentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives', 'weight-summary', parentId, parentType, planKey] });
    }
  });

  if (isLoading && !isNewPlan) {
    return <div className="text-center p-4">{t('common.loading')}</div>;
  }

  // If it's a new plan, show empty state
  if (isNewPlan) {
    return (
      <div className="text-center p-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Initiatives Yet</h3>
        <p className="text-gray-500 mb-4">
          Start by creating your first initiative for this {parentType}.
        </p>
        {isUserPlanner && (
          <button 
            onClick={() => onEditInitiative({})}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Initiative
          </button>
        )}
      </div>
    );
  }

  if (!initiativesList?.data) {
    return null;
  }

  // Get weight summary data with proper type handling
  const { 
    parent_weight = 0,
    total_initiatives_weight = 0, 
    remaining_weight = 0,
    is_valid = false 
  } = weightSummary?.data || {};

  // Show empty state if no initiatives found
  if (initiativesList.data.length === 0) {
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
              <p className="text-sm text-gray-500">Parent Weight</p>
              <p className="text-2xl font-semibold text-gray-900">{parent_weight}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('planning.allocatedWeight')}</p>
              <p className="text-2xl font-semibold text-blue-600">0%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('planning.remainingWeight')}</p>
              <p className="text-2xl font-semibold text-green-600">{parent_weight}%</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-700">Initiatives</h3>
          {showTodayOnly && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
              Showing today's initiatives
            </span>
          )}
        </div>

        <div className="text-center p-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Initiatives Found</h3>
          <p className="text-gray-500 mb-4">
            No initiatives have been created yet for this {parentType}.
          </p>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-gray-500">Parent Weight</p>
            <p className="text-2xl font-semibold text-gray-900">{parent_weight}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('planning.allocatedWeight')}</p>
            <p className="text-2xl font-semibold text-blue-600">{total_initiatives_weight}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('planning.remainingWeight')}</p>
            <p className={`text-2xl font-semibold ${remaining_weight === 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {remaining_weight}%
            </p>
          </div>
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
              Total weight must equal the parent weight ({parent_weight}%). 
              Current total: {total_initiatives_weight}%
            </p>
          </div>
        )}

        {remaining_weight === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm">
              Weight distribution is balanced at {parent_weight}%
            </p>
          </div>
        )}

        {isUserPlanner && (
          <div className="mt-4">
            <button
              onClick={() => validateInitiativesMutation.mutate()}
              disabled={validateInitiativesMutation.isPending}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {validateInitiativesMutation.isPending ? 'Validating...' : 'Validate Initiatives Weight'}
            </button>
            
            {validateInitiativesMutation.isError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {(validateInitiativesMutation.error as any)?.response?.data?.message || 
                  'Failed to validate initiatives weight'}
              </div>
            )}
            
            {validateInitiativesMutation.isSuccess && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                {validateInitiativesMutation.data?.data?.message || 'Initiatives weight validated successfully'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Initiatives</h3>
        {showTodayOnly && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
            Showing today's initiatives
          </span>
        )}
      </div>

      <div className="space-y-2">
        {initiativesList.data.map((initiative) => (
          <div
            key={initiative.id}
            onClick={() => onSelectInitiative && onSelectInitiative(initiative)}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{initiative.name}</h4>
              <span className="text-sm font-medium text-blue-600">
                {initiative.weight}%
              </span>
            </div>
            
            <div className="flex justify-end mt-2">
              {isUserPlanner ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent initiative selection when clicking edit
                    onEditInitiative(initiative);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <div className="text-xs text-gray-500 flex items-center">
                  <Lock className="h-3 w-3 mr-1" />
                  {t('planning.permissions.readOnly')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InitiativeList;