import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Loader, ArrowLeft, DollarSign, AlertCircle, Info } from 'lucide-react';
import type { MainActivity, ActivityType, BudgetCalculationType } from '../types/plan';

interface ActivityBudgetFormProps {
  activity: MainActivity;
  budgetCalculationType?: BudgetCalculationType;
  activityType?: ActivityType | null;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ActivityBudgetForm: React.FC<ActivityBudgetFormProps> = ({
  activity,
  budgetCalculationType = 'WITHOUT_TOOL',
  activityType,
  onSubmit,
  initialData,
  onCancel,
  isSubmitting = false
}) => {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [isBudgetSubmitting, setIsBudgetSubmitting] = useState(false);
  
  console.log("ActivityBudgetForm initialData:", initialData);
  console.log("Budget calculation type:", budgetCalculationType);
  console.log("Activity type:", activityType);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
    defaultValues: {
      activity_id: activity.id,
      budget_calculation_type: budgetCalculationType,
      activity_type: activityType,
      estimated_cost_with_tool: initialData?.estimated_cost_with_tool || 0,
      estimated_cost_without_tool: initialData?.estimated_cost_without_tool || 0,
      government_treasury: initialData?.government_treasury || 0,
      sdg_funding: initialData?.sdg_funding || 0,
      partners_funding: initialData?.partners_funding || 0,
      other_funding: initialData?.other_funding || 0,
      // Preserve tool-specific details
      training_details: initialData?.training_details,
      meeting_workshop_details: initialData?.meeting_workshop_details,
      procurement_details: initialData?.procurement_details,
      printing_details: initialData?.printing_details,
      supervision_details: initialData?.supervision_details
    }
  });

  // Watch values for calculations
  const governmentTreasury = Number(watch('government_treasury')) || 0;
  const sdgFunding = Number(watch('sdg_funding')) || 0;
  const partnersFunding = Number(watch('partners_funding')) || 0;
  const otherFunding = Number(watch('other_funding')) || 0;
  const withToolCost = Number(watch('estimated_cost_with_tool')) || 0;
  const withoutToolCost = Number(watch('estimated_cost_without_tool')) || 0;

  // Calculate totals
  const totalFunding = governmentTreasury + sdgFunding + partnersFunding + otherFunding;
  const estimatedCost = budgetCalculationType === 'WITH_TOOL' ? withToolCost : withoutToolCost;
  const fundingGap = estimatedCost - totalFunding;

  // Debug logging
  useEffect(() => {
    console.log("Budget Form Values:", {
      budgetCalculationType,
      withToolCost,
      withoutToolCost,
      estimatedCost,
      totalFunding,
      fundingGap,
      activityType
    });
  }, [
    budgetCalculationType, 
    withToolCost, 
    withoutToolCost,
    totalFunding,
    estimatedCost,
    fundingGap,
    activityType
  ]);

  const handleFormSubmit = async (data: any) => {
    try {
      setError(null);
      setIsBudgetSubmitting(true);

      // Validate total funding against estimated cost
      if (totalFunding > estimatedCost) {
        setError('Total funding cannot exceed estimated cost');
        setIsBudgetSubmitting(false);
        return;
      }

      const budgetData = {
        activity_id: activity.id,
        budget_calculation_type: budgetCalculationType,
        activity_type: activityType,
        estimated_cost_with_tool: budgetCalculationType === 'WITH_TOOL' ? Number(withToolCost) : 0,
        estimated_cost_without_tool: budgetCalculationType === 'WITHOUT_TOOL' ? Number(withoutToolCost) : 0,
        government_treasury: Number(data.government_treasury),
        sdg_funding: Number(data.sdg_funding),
        partners_funding: Number(data.partners_funding),
        other_funding: Number(data.other_funding),
        // Preserve tool-specific details
        training_details: data.training_details,
        meeting_workshop_details: data.meeting_workshop_details,
        procurement_details: data.procurement_details,
        printing_details: data.printing_details,
        supervision_details: data.supervision_details
      };

      console.log("Submitting budget data:", budgetData);

      await onSubmit(budgetData);
      
      // Success - no need to reset isSubmitting state here as we're leaving the form
    } catch (error: any) {
      console.error('Error submitting budget form:', error);
      setError(error.message || 'Failed to save budget');
      setIsBudgetSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center text-gray-600 hover:text-gray-900"
          disabled={isSubmitting || isBudgetSubmitting}
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
        <div className="text-sm text-gray-500">
          Activity: {activity.name}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Estimated Cost Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Estimated Cost</h3>
        
        {budgetCalculationType === 'WITH_TOOL' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {activityType ? `Calculated using ${activityType} costing tool` : 'Calculated using costing tool'}
              </span>
              <span className="text-2xl font-bold text-green-600">
                ${withToolCost.toLocaleString()}
              </span>
            </div>
            <input
              type="hidden"
              {...register('estimated_cost_with_tool')}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Manual Cost Estimation
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                {...register('estimated_cost_without_tool', {
                  required: 'This field is required',
                  min: { value: 0, message: 'Value must be positive' },
                  valueAsNumber: true
                })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
            {errors.estimated_cost_without_tool && (
              <p className="mt-1 text-sm text-red-600">{errors.estimated_cost_without_tool.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Funding Sources Section */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Funding Sources</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Government Treasury
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                {...register('government_treasury', {
                  required: 'This field is required',
                  min: { value: 0, message: 'Value must be positive' },
                  valueAsNumber: true
                })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              SDG Funding
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                {...register('sdg_funding', {
                  required: 'This field is required',
                  min: { value: 0, message: 'Value must be positive' },
                  valueAsNumber: true
                })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Partners Funding (Channels 2 & 3)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                {...register('partners_funding', {
                  required: 'This field is required',
                  min: { value: 0, message: 'Value must be positive' },
                  valueAsNumber: true
                })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Other Funding
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                {...register('other_funding', {
                  required: 'This field is required',
                  min: { value: 0, message: 'Value must be positive' },
                  valueAsNumber: true
                })}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Budget Summary</h3>
          <DollarSign className="h-5 w-5 text-gray-400" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Estimated Cost:</span>
            <span className="font-medium">${estimatedCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Funding:</span>
            <span className="font-medium">${totalFunding.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Funding Gap:</span>
              <span className={`font-medium ${fundingGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(fundingGap).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {fundingGap > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">
              Additional funding of ${fundingGap.toLocaleString()} is needed
            </p>
          </div>
        )}

        {fundingGap < 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-700">
              Total funding exceeds estimated cost by ${Math.abs(fundingGap).toLocaleString()}
            </p>
          </div>
        )}

        {fundingGap === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <Info className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700">
              Budget is fully funded
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting || isBudgetSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isBudgetSubmitting || totalFunding > estimatedCost}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting || isBudgetSubmitting ? (
            <span className="flex items-center">
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Budget'
          )}
        </button>
      </div>
    </form>
  );
};

export default ActivityBudgetForm;