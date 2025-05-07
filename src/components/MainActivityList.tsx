import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mainActivities } from '../lib/api';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { BarChart3, AlertCircle, CheckCircle, Edit, Trash2, Lock, DollarSign, Calculator, FileText, Eye, Info, ArrowLeft, Send, X } from 'lucide-react';
import type { MainActivity, ActivityType, BudgetCalculationType } from '../types/plan';
import { auth } from '../lib/api';
import { isPlanner } from '../types/user';
import ActivityBudgetForm from './ActivityBudgetForm';
import TrainingCostingTool from './TrainingCostingTool';
import MeetingWorkshopCostingTool from './MeetingWorkshopCostingTool';
import PrintingCostingTool from './PrintingCostingTool';
import ProcurementCostingTool from './ProcurementCostingTool';
import SupervisionCostingTool from './SupervisionCostingTool';

interface MainActivityListProps {
  initiativeId: string;
  onEditActivity: (activity: MainActivity) => void;
  onDeleteActivity: (activityId: string) => void;
}

const MainActivityList: React.FC<MainActivityListProps> = ({ 
  initiativeId, 
  onEditActivity,
  onDeleteActivity
}) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isUserPlanner, setIsUserPlanner] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = useState<MainActivity | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showBudgetTypeModal, setShowBudgetTypeModal] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [budgetCalculationType, setBudgetCalculationType] = useState<BudgetCalculationType>('WITHOUT_TOOL');
  const [showTrainingTool, setShowTrainingTool] = useState(false);
  const [showMeetingWorkshopTool, setShowMeetingWorkshopTool] = useState(false);
  const [showPrintingTool, setShowPrintingTool] = useState(false);
  const [showProcurementTool, setShowProcurementTool] = useState(false);
  const [showSupervisionTool, setShowSupervisionTool] = useState(false);
  const [toolCalculatedCosts, setToolCalculatedCosts] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBudgetPreview, setShowBudgetPreview] = useState(false);
  
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

  // Fetch weight summary based on parent type
  const { data: weightSummary } = useQuery({
    queryKey: ['main-activities', 'weight-summary', initiativeId],
    queryFn: () => mainActivities.getWeightSummary(initiativeId),
  });

  // Fetch activities based on parent type
  const { data: activitiesList, isLoading } = useQuery({
    queryKey: ['main-activities', initiativeId],
    queryFn: () => mainActivities.getByInitiative(initiativeId),
  });

  const updateBudgetMutation = useMutation({
    mutationFn: (data: any) => {
      if (!selectedActivity) throw new Error('No activity selected');
      console.log("Calling updateBudget API with data:", data);
      return mainActivities.updateBudget(selectedActivity.id, data);
    },
    onSuccess: (data) => {
      console.log("Budget updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['main-activities', initiativeId] });
      handleCancelCosting();
      setError(null);
    },
    onError: (error: any) => {
      console.error('Budget update error:', error);
      setError(error.message || 'Failed to update budget');
      setIsProcessing(false);
    }
  });

  const handleActivitySelect = (activity: MainActivity) => {
    // If the activity already has a budget, use its calculation type
    const existingBudgetType = activity.budget?.budget_calculation_type || 'WITHOUT_TOOL';
    const existingActivityType = activity.budget?.activity_type || null;
    
    setSelectedActivity(activity);
    setShowBudgetTypeModal(true);
    setShowBudgetForm(false);
    setActivityType(existingActivityType);
    setBudgetCalculationType(existingBudgetType);
    setShowTrainingTool(false);
    setShowMeetingWorkshopTool(false);
    setShowPrintingTool(false);
    setShowProcurementTool(false);
    setShowSupervisionTool(false);
    setToolCalculatedCosts(null);
    setError(null);
    setShowBudgetPreview(false);
    setIsProcessing(false); // Reset processing state
  };

  const handleBudgetTypeSelect = (type: BudgetCalculationType) => {
    setBudgetCalculationType(type);
    setShowBudgetTypeModal(false);
    setError(null);
    
    if (type === 'WITH_TOOL') {
      // For editing existing budgets, don't ask activity type again if already set
      if (selectedActivity?.budget?.activity_type && selectedActivity.budget.budget_calculation_type === 'WITH_TOOL') {
        const existingType = selectedActivity.budget.activity_type;
        setActivityType(existingType);
        setShowBudgetForm(true);
      } else {
        // Show activity type selection for new budgets
        setActivityType(null);
      }
    } else {
      // Skip to budget form with manual cost entry
      if (selectedActivity) {
        setShowBudgetForm(true);
      }
    }
  };

  const handleActivityTypeSelect = (type: ActivityType) => {
    setActivityType(type);
    setShowBudgetForm(false);
    setToolCalculatedCosts(null);
    setError(null);
    setIsProcessing(false);

    // Reset all tool visibility
    setShowTrainingTool(false);
    setShowMeetingWorkshopTool(false);
    setShowPrintingTool(false);
    setShowProcurementTool(false);
    setShowSupervisionTool(false);

    // If we already have a budget with this activity type and WITH_TOOL calculation type,
    // go directly to budget form
    if (selectedActivity?.budget?.activity_type === type && 
        selectedActivity.budget.budget_calculation_type === 'WITH_TOOL') {
      setShowBudgetForm(true);
      return;
    }

    // Show selected tool
    switch (type) {
      case 'Training':
        setShowTrainingTool(true);
        break;
      case 'Meeting':
      case 'Workshop':
        setShowMeetingWorkshopTool(true);
        break;
      case 'Printing':
        setShowPrintingTool(true);
        break;
      case 'Procurement':
        setShowProcurementTool(true);
        break;
      case 'Supervision':
        setShowSupervisionTool(true);
        break;
      case 'Other':
        // For 'Other', go directly to budget form with manual entry
        setBudgetCalculationType('WITHOUT_TOOL');
        setShowBudgetForm(true);
        break;
    }
  };

  const handleToolCalculation = async (costs: any) => {
    if (!selectedActivity || !activityType) {
      setError("Activity information is missing");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      console.log("Processing tool calculation...", costs);
      console.log("Activity type:", activityType);

      // Store the calculated costs for later use
      setToolCalculatedCosts(costs);

      // Ensure all numeric values are properly converted to numbers
      const totalBudget = Number(costs.totalBudget) || 0;
      console.log("Total budget from tool calculation:", totalBudget);

      // Create initial budget data with calculated costs
      const budgetData = {
        activity_id: selectedActivity.id,
        budget_calculation_type: 'WITH_TOOL' as BudgetCalculationType,
        activity_type: activityType,
        estimated_cost_with_tool: totalBudget,
        estimated_cost_without_tool: 0,
        government_treasury: 0,
        sdg_funding: 0,
        partners_funding: 0,
        other_funding: 0
      };

      console.log("Initial budget data to be sent to API:", budgetData);

      // Add type-specific details based on activity type
      switch (activityType) {
        case 'Training':
          budgetData.training_details = costs;
          break;
        case 'Meeting':
        case 'Workshop':
          budgetData.meeting_workshop_details = costs;
          break;
        case 'Procurement':
          budgetData.procurement_details = costs;
          break;
        case 'Printing':
          budgetData.printing_details = costs;
          break;
        case 'Supervision':
          budgetData.supervision_details = costs;
          break;
      }

      console.log("Saving budget data with costing details:", budgetData);

      // Save initial budget data with await to ensure proper flow
      const response = await updateBudgetMutation.mutateAsync(budgetData);
      console.log("Budget saved successfully, API response:", response);
      
      // Update activity with new budget
      if (response && response.data) {
        const updatedActivity = {
          ...selectedActivity,
          budget: response.data
        };
        setSelectedActivity(updatedActivity);
        
        // Hide all costing tools
        setShowTrainingTool(false);
        setShowMeetingWorkshopTool(false);
        setShowProcurementTool(false);
        setShowPrintingTool(false);
        setShowSupervisionTool(false);
        
        // Show budget form with WITH_TOOL calculation type
        setBudgetCalculationType('WITH_TOOL');
        setShowBudgetForm(true);
        setIsProcessing(false);
      } else {
        throw new Error("No response data received from server");
      }
    } catch (error: any) {
      console.error('Failed to save initial budget:', error);
      setError(error.message || 'Failed to save budget data. Please try again.');
      setIsProcessing(false);

      // Reset tools visibility on error
      setShowTrainingTool(false);
      setShowMeetingWorkshopTool(false);
      setShowProcurementTool(false);
      setShowPrintingTool(false);
      setShowSupervisionTool(false);
    }
  };

  const handleCancelCosting = () => {
    setSelectedActivity(null);
    setShowBudgetTypeModal(false);
    setShowBudgetForm(false);
    setActivityType(null);
    setBudgetCalculationType('WITHOUT_TOOL');
    setShowTrainingTool(false);
    setShowMeetingWorkshopTool(false);
    setShowPrintingTool(false);
    setShowProcurementTool(false);
    setShowSupervisionTool(false);
    setToolCalculatedCosts(null);
    setError(null);
    setIsProcessing(false);
    setShowBudgetPreview(false);
  };

  const handlePreviewBudget = (activity: MainActivity) => {
    setSelectedActivity(activity);
    setShowBudgetPreview(true);
  };

  if (isLoading) {
    return <div className="text-center p-4">{t('common.loading')}</div>;
  }

  if (!activitiesList?.data) {
    return null;
  }

  const { 
    initiative_weight = 0,
    expected_activities_weight = 65,
    total_activities_weight = 0, 
    remaining_weight = 65,
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
            <p className="text-2xl font-semibold text-blue-600">{total_activities_weight}%</p>
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
            <strong>Note:</strong> The total weight of main activities must equal 65% of the initiative weight.
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
              Total weight must equal {expected_activities_weight}%. Current total: {total_activities_weight}%
            </p>
          </div>
        )}

        {remaining_weight === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm">
              Weight distribution is balanced
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {activitiesList.data.map((activity) => (
          <div
            key={activity.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{activity.name}</h4>
              <span className="text-sm font-medium text-blue-600">
                {activity.weight}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
              <div>
                <span className="text-gray-500">Period:</span> 
                <span className="ml-2">
                  {activity.selected_quarters.length > 0
                    ? activity.selected_quarters.join(', ')
                    : activity.selected_months.join(', ')}
                </span>
              </div>
              
              {activity.budget && (
                <div>
                  <span className="text-gray-500">Budget:</span>
                  <span className="ml-2 font-medium">
                    ${activity.budget.budget_calculation_type === 'WITH_TOOL' 
                        ? activity.budget.estimated_cost_with_tool 
                        : activity.budget.estimated_cost_without_tool}
                  </span>
                </div>
              )}
            </div>
            
            {isUserPlanner && (
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={() => onEditActivity(activity)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteActivity(activity.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {!activity.budget && (
                  <button
                    onClick={() => handleActivitySelect(activity)}
                    className="flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-800"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Add Budget
                  </button>
                )}
                {activity.budget && (
                  <>
                    <button
                      onClick={() => handleActivitySelect(activity)}
                      className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Budget
                    </button>
                    <button
                      onClick={() => handlePreviewBudget(activity)}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview Budget
                    </button>
                  </>
                )}
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
        ))}

        {activitiesList.data.length === 0 && (
          <div className="text-center p-4 text-gray-500">
            No main activities yet
          </div>
        )}
      </div>

      {/* Budget Calculation Type Selection Modal */}
      {selectedActivity && showBudgetTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
              Choose Budget Calculation Method
            </h3>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              <button
                onClick={() => handleBudgetTypeSelect('WITH_TOOL')}
                className="p-6 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center gap-3 transition-colors"
              >
                <Calculator className="h-12 w-12 text-blue-600" />
                <div className="text-center">
                  <h4 className="font-medium text-lg">Use Costing Tool</h4>
                  <p className="text-sm text-gray-600">Calculate budget using specialized costing tools based on activity type</p>
                </div>
              </button>
              
              <button
                onClick={() => handleBudgetTypeSelect('WITHOUT_TOOL')}
                className="p-6 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center gap-3 transition-colors"
              >
                <FileText className="h-12 w-12 text-green-600" />
                <div className="text-center">
                  <h4 className="font-medium text-lg">Manual Budget Entry</h4>
                  <p className="text-sm text-gray-600">Enter budget details manually without using costing tools</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={handleCancelCosting}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activity Type Selection Modal */}
      {selectedActivity && budgetCalculationType === 'WITH_TOOL' && !activityType && !showBudgetForm && !showBudgetTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Select Activity Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleActivityTypeSelect('Training')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Training
              </button>
              <button
                onClick={() => handleActivityTypeSelect('Meeting')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Meeting
              </button>
              <button
                onClick={() => handleActivityTypeSelect('Workshop')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Workshop
              </button>
              <button
                onClick={() => handleActivityTypeSelect('Printing')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Printing
              </button>
              <button
                onClick={() => handleActivityTypeSelect('Supervision')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Supervision
              </button>
              <button
                onClick={() => handleActivityTypeSelect('Procurement')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                Procurement
              </button>
              <button
                onClick={() => handleActivityTypeSelect('Other')}
                className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 col-span-2"
              >
                Other
              </button>
            </div>
            <button
              onClick={handleCancelCosting}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Costing Tools */}
      {selectedActivity && activityType && !showBudgetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {showTrainingTool && (
              <TrainingCostingTool
                onCalculate={handleToolCalculation}
                onCancel={handleCancelCosting}
                initialData={selectedActivity.budget?.training_details}
              />
            )}
            
            {showMeetingWorkshopTool && (
              <MeetingWorkshopCostingTool
                activityType={activityType as 'Meeting' | 'Workshop'}
                onCalculate={handleToolCalculation}
                onCancel={handleCancelCosting}
                initialData={selectedActivity.budget?.meeting_workshop_details}
              />
            )}
            
            {showPrintingTool && (
              <PrintingCostingTool
                onCalculate={handleToolCalculation}
                onCancel={handleCancelCosting}
                initialData={selectedActivity.budget?.printing_details}
              />
            )}
            
            {showProcurementTool && (
              <ProcurementCostingTool
                onCalculate={handleToolCalculation}
                onCancel={handleCancelCosting}
                initialData={selectedActivity.budget?.procurement_details}
              />
            )}
            
            {showSupervisionTool && (
              <SupervisionCostingTool
                onCalculate={handleToolCalculation}
                onCancel={handleCancelCosting}
                initialData={selectedActivity.budget?.supervision_details}
              />
            )}
          </div>
        </div>
      )}

      {/* Budget Form */}
      {selectedActivity && showBudgetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <ActivityBudgetForm
              activity={selectedActivity}
              budgetCalculationType={budgetCalculationType}
              activityType={activityType}
              onSubmit={async (data) => {
                try {
                  await updateBudgetMutation.mutateAsync(data);
                  return Promise.resolve();
                } catch (error) {
                  console.error('Failed to update budget:', error);
                  throw error;
                }
              }}
              initialData={selectedActivity.budget}
              onCancel={handleCancelCosting}
              isSubmitting={updateBudgetMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Budget Preview Modal */}
      {selectedActivity && showBudgetPreview && selectedActivity.budget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Budget Details</h2>
              <button
                onClick={() => setShowBudgetPreview(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Activity Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Activity Name</p>
                      <p className="font-medium">{selectedActivity.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Activity Type</p>
                      <p className="font-medium">{selectedActivity.budget.activity_type || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Budget Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Calculation Method</p>
                      <p className="font-medium">
                        {selectedActivity.budget.budget_calculation_type === 'WITH_TOOL' ? 'Using Costing Tool' : 'Manual Entry'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Budget Required</p>
                      <p className="font-medium text-green-600">
                        ${(selectedActivity.budget.budget_calculation_type === 'WITH_TOOL' 
                            ? selectedActivity.budget.estimated_cost_with_tool 
                            : selectedActivity.budget.estimated_cost_without_tool).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Funding Sources</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Government Treasury</span>
                      <span className="font-medium">${selectedActivity.budget.government_treasury.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">SDG Funding</span>
                      <span className="font-medium">${selectedActivity.budget.sdg_funding.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Partners Funding</span>
                      <span className="font-medium">${selectedActivity.budget.partners_funding.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Other Funding</span>
                      <span className="font-medium">${selectedActivity.budget.other_funding.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Available Funding</span>
                        <span className="font-medium text-blue-600">
                          ${(
                            selectedActivity.budget.government_treasury +
                            selectedActivity.budget.sdg_funding +
                            selectedActivity.budget.partners_funding +
                            selectedActivity.budget.other_funding
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Funding Gap Analysis</h4>
                  <div className="space-y-3">
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Required</span>
                      <span className="font-medium">
                        ${(selectedActivity.budget.budget_calculation_type === 'WITH_TOOL' 
                          ? selectedActivity.budget.estimated_cost_with_tool 
                          : selectedActivity.budget.estimated_cost_without_tool).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Available</span>
                      <span className="font-medium">
                        ${(
                          selectedActivity.budget.government_treasury +
                          selectedActivity.budget.sdg_funding +
                          selectedActivity.budget.partners_funding +
                          selectedActivity.budget.other_funding
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Funding Gap</span>
                        <span className={`font-medium ${selectedActivity.budget.funding_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.abs(selectedActivity.budget.funding_gap).toLocaleString()}
                          {selectedActivity.budget.funding_gap > 0 ? ' (Deficit)' : ' (Fully Funded)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity-specific details based on type */}
                {selectedActivity.budget.activity_type && selectedActivity.budget.budget_calculation_type === 'WITH_TOOL' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Activity Details</h4>
                    {selectedActivity.budget.training_details && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Number of Days</p>
                            <p className="font-medium">{selectedActivity.budget.training_details.numberOfDays}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Number of Participants</p>
                            <p className="font-medium">{selectedActivity.budget.training_details.numberOfParticipants}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-medium">{selectedActivity.budget.training_details.trainingLocation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Add similar sections for other activity types */}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowBudgetPreview(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainActivityList;