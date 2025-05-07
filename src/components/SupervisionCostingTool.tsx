import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Calculator, DollarSign, Info, AlertCircle } from 'lucide-react';
import type { SupervisionCost } from '../types/costing';
import { 
  TRAINING_LOCATIONS, 
  SUPERVISOR_COSTS,
  COST_ASSUMPTIONS 
} from '../types/costing';

interface SupervisionCostingToolProps {
  onCalculate: (costs: SupervisionCost) => void;
  onCancel: () => void;
  initialData?: SupervisionCost;
}

const SupervisionCostingTool: React.FC<SupervisionCostingToolProps> = ({ 
  onCalculate,
  onCancel, 
  initialData 
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, watch, control, setValue, handleSubmit, formState: { errors }, trigger } = useForm<SupervisionCost>({
    defaultValues: initialData || {
      description: '',
      numberOfDays: 1,
      numberOfSupervisors: 1,
      numberOfSupervisorsWithAdditionalCost: 0,
      additionalSupervisorCosts: [],
      transportRequired: false,
      landTransportSupervisors: 0,
      airTransportSupervisors: 0,
      otherCosts: 0
    }
  });

  const watchTransportRequired = watch('transportRequired');
  const watchLocation = watch('trainingLocation');
  const watchDays = watch('numberOfDays');
  const watchSupervisors = watch('numberOfSupervisors');
  const watchSupervisorCosts = watch('additionalSupervisorCosts');
  const watchLandTransport = watch('landTransportSupervisors');
  const watchAirTransport = watch('airTransportSupervisors');
  const watchOtherCosts = watch('otherCosts');

  // Re-validate transport supervisors when total supervisors changes
  useEffect(() => {
    if (watchTransportRequired) {
      trigger(['landTransportSupervisors', 'airTransportSupervisors']);
    }
  }, [watchSupervisors, trigger, watchTransportRequired]);

  useEffect(() => {
    const calculateTotalBudget = () => {
      const location = watchLocation;
      const days = watchDays || 0;
      const supervisors = watchSupervisors || 0;
      
      // Per diem and accommodation
      const perDiemTotal = COST_ASSUMPTIONS.perDiem[location] * supervisors * days;
      const accommodationTotal = COST_ASSUMPTIONS.accommodation[location] * supervisors * (days - 1);
      
      // Transport costs
      let transportTotal = 0;
      if (watchTransportRequired) {
        const landSupervisors = Number(watchLandTransport) || 0;
        const airSupervisors = Number(watchAirTransport) || 0;
        transportTotal = (landSupervisors * COST_ASSUMPTIONS.transport.land) + 
                        (airSupervisors * COST_ASSUMPTIONS.transport.air);
      }
      
      // Additional supervisor costs
      let supervisorCostsTotal = 0;
      if (watchSupervisorCosts) {
        watchSupervisorCosts.forEach(cost => {
          const costConfig = SUPERVISOR_COSTS.find(c => c.value === cost);
          if (costConfig) {
            supervisorCostsTotal += costConfig.amount * supervisors;
          }
        });
      }
      
      // Other costs
      const otherCostsTotal = Number(watchOtherCosts) || 0;
      
      // Calculate total
      const total = perDiemTotal + accommodationTotal + transportTotal + 
                   supervisorCostsTotal + otherCostsTotal;
      
      setValue('totalBudget', total);
      return total;
    };

    calculateTotalBudget();
  }, [
    watchLocation, watchDays, watchSupervisors, watchTransportRequired,
    watchLandTransport, watchAirTransport, watchSupervisorCosts,
    watchOtherCosts, setValue
  ]);

  const handleFormSubmit = async (data: SupervisionCost) => {
    try {
      setIsCalculating(true);
      setError(null);
      
      const totalBudget = watch('totalBudget');
      
      if (!totalBudget || totalBudget <= 0) {
        setError('Total budget must be greater than 0');
        return;
      }

      // Validate transport supervisors
      if (watchTransportRequired) {
        const totalTransport = (Number(watchLandTransport) || 0) + (Number(watchAirTransport) || 0);
        if (totalTransport > (watchSupervisors || 0)) {
          setError('Total transport supervisors cannot exceed total supervisors');
          return;
        }
      }
      
      const supervisionCosts: SupervisionCost = {
        ...data,
        totalBudget: totalBudget || 0
      };
      
      onCalculate(supervisionCosts);
    } catch (error: any) {
      console.error('Failed to process supervision costs:', error);
      setError(error.message || 'Failed to process costs. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex-1">
          <h3 className="text-lg font-medium text-blue-800 mb-2 flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Supervision Cost Calculator
          </h3>
          <p className="text-sm text-blue-600">
            Fill in the supervision details below to calculate the total budget.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="ml-4 p-2 text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Cancel</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description of Supervision Activity
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Describe the supervision activity..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Number of Days
          </label>
          <input
            type="number"
            min="1"
            {...register('numberOfDays', {
              required: 'Number of days is required',
              min: { value: 1, message: 'Minimum 1 day required' },
              valueAsNumber: true
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.numberOfDays && (
            <p className="mt-1 text-sm text-red-600">{errors.numberOfDays.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Number of Supervisors
          </label>
          <input
            type="number"
            min="1"
            {...register('numberOfSupervisors', {
              required: 'Number of supervisors is required',
              min: { value: 1, message: 'Minimum 1 supervisor required' },
              valueAsNumber: true
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.numberOfSupervisors && (
            <p className="mt-1 text-sm text-red-600">{errors.numberOfSupervisors.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <select
          {...register('trainingLocation', { required: 'Location is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {TRAINING_LOCATIONS.map(location => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
        {errors.trainingLocation && (
          <p className="mt-1 text-sm text-red-600">{errors.trainingLocation.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Additional Supervisor Costs
        </label>
        <Controller
          name="additionalSupervisorCosts"
          control={control}
          render={({ field }) => (
            <div className="mt-2 space-y-2">
              {SUPERVISOR_COSTS.map(cost => (
                <label key={cost.value} className="inline-flex items-center mr-4">
                  <input
                    type="checkbox"
                    value={cost.value}
                    checked={field.value?.includes(cost.value)}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newSelection = e.target.checked
                        ? [...(field.value || []), value]
                        : (field.value || []).filter(v => v !== value);
                      field.onChange(newSelection);
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{cost.label}</span>
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Transport Required?
        </label>
        <div className="mt-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              {...register('transportRequired')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </label>
        </div>
      </div>

      {watchTransportRequired && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Number of Supervisors (Land Transport)
            </label>
            <input
              type="number"
              min="0"
              {...register('landTransportSupervisors', {
                min: { value: 0, message: 'Cannot be negative' },
                valueAsNumber: true,
                validate: value => {
                  const airSupervisors = Number(watchAirTransport) || 0;
                  const total = (Number(value) || 0) + airSupervisors;
                  return total <= (watchSupervisors || 0) || 
                    `Total transport supervisors (${total}) cannot exceed total supervisors (${watchSupervisors})`;
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.landTransportSupervisors && (
              <p className="mt-1 text-sm text-red-600">{errors.landTransportSupervisors.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Number of Supervisors (Air Transport)
            </label>
            <input
              type="number"
              min="0"
              {...register('airTransportSupervisors', {
                min: { value: 0, message: 'Cannot be negative' },
                valueAsNumber: true,
                validate: value => {
                  const landSupervisors = Number(watchLandTransport) || 0;
                  const total = (Number(value) || 0) + landSupervisors;
                  return total <= (watchSupervisors || 0) || 
                    `Total transport supervisors (${total}) cannot exceed total supervisors (${watchSupervisors})`;
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.airTransportSupervisors && (
              <p className="mt-1 text-sm text-red-600">{errors.airTransportSupervisors.message}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Other Costs (ETB)
        </label>
        <input
          type="number"
          min="0"
          {...register('otherCosts', {
            min: { value: 0, message: 'Cannot be negative' },
            valueAsNumber: true
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="0"
        />
        {errors.otherCosts && (
          <p className="mt-1 text-sm text-red-600">{errors.otherCosts.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Justification for Additional Costs
        </label>
        <textarea
          {...register('justification')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Explain any additional costs..."
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-lg font-medium text-gray-900">Total Supervision Budget</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-bold text-green-600">
              ETB {watch('totalBudget')?.toLocaleString() || '0'}
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isCalculating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCalculating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isCalculating ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Continue to Budget Form'
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500 flex items-center">
          <Info className="h-4 w-4 mr-1" />
          This total is calculated based on the standard rates and your inputs
        </p>
      </div>
    </form>
  );
};

export default SupervisionCostingTool;