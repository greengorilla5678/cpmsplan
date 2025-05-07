import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Calculator, DollarSign, Info, AlertCircle } from 'lucide-react';
import type { MeetingWorkshopCost } from '../types/costing';
import { 
  TRAINING_LOCATIONS, 
  PARTICIPANT_COSTS, 
  SESSION_COSTS,
  COST_ASSUMPTIONS 
} from '../types/costing';

interface MeetingWorkshopCostingToolProps {
  activityType: 'Meeting' | 'Workshop';
  onCalculate: (costs: MeetingWorkshopCost) => void;
  onCancel: () => void;
  initialData?: MeetingWorkshopCost;
}

const MeetingWorkshopCostingTool: React.FC<MeetingWorkshopCostingToolProps> = ({ 
  activityType,
  onCalculate, 
  onCancel,
  initialData 
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, watch, control, setValue, handleSubmit, formState: { errors }, trigger } = useForm<MeetingWorkshopCost>({
    defaultValues: initialData || {
      description: '',
      numberOfDays: 1,
      numberOfParticipants: 1,
      location: 'Addis_Ababa',
      additionalParticipantCosts: [],
      additionalSessionCosts: [],
      transportRequired: false,
      otherCosts: 0
    }
  });

  const watchTransportRequired = watch('transportRequired');
  const watchLocation = watch('location');
  const watchDays = watch('numberOfDays');
  const watchParticipants = watch('numberOfParticipants');
  const watchParticipantCosts = watch('additionalParticipantCosts');
  const watchSessionCosts = watch('additionalSessionCosts');
  const watchLandTransport = watch('landTransportParticipants');
  const watchAirTransport = watch('airTransportParticipants');
  const watchOtherCosts = watch('otherCosts');

  // Re-validate transport participants when total participants changes
  useEffect(() => {
    if (watchTransportRequired) {
      trigger(['landTransportParticipants', 'airTransportParticipants']);
    }
  }, [watchParticipants, trigger, watchTransportRequired]);

  useEffect(() => {
    const calculateTotalBudget = () => {
      const location = watchLocation;
      const days = watchDays || 0;
      const participants = watchParticipants || 0;
      
      // Per diem and accommodation
      const perDiemTotal = COST_ASSUMPTIONS.perDiem[location] * participants * days;
      const accommodationTotal = COST_ASSUMPTIONS.accommodation[location] * participants * (days - 1);
      
      // Venue cost
      const venueTotal = COST_ASSUMPTIONS.venue[location] * days;
      
      // Transport costs
      let transportTotal = 0;
      if (watchTransportRequired) {
        const landParticipants = watchLandTransport || 0;
        const airParticipants = watchAirTransport || 0;
        transportTotal = (landParticipants * COST_ASSUMPTIONS.transport.land) + 
                        (airParticipants * COST_ASSUMPTIONS.transport.air);
      }
      
      // Additional participant costs
      let participantCostsTotal = 0;
      if (watchParticipantCosts) {
        if (watchParticipantCosts.includes('All')) {
          participantCostsTotal = participants * 
            (COST_ASSUMPTIONS.participantCosts.Flash_Disk + COST_ASSUMPTIONS.participantCosts.Stationary);
        } else {
          watchParticipantCosts.forEach(cost => {
            participantCostsTotal += participants * COST_ASSUMPTIONS.participantCosts[cost];
          });
        }
      }
      
      // Additional session costs
      let sessionCostsTotal = 0;
      if (watchSessionCosts) {
        if (watchSessionCosts.includes('All')) {
          sessionCostsTotal = COST_ASSUMPTIONS.sessionCosts.Flip_Chart + 
                            COST_ASSUMPTIONS.sessionCosts.Marker +
                            COST_ASSUMPTIONS.sessionCosts.Toner_Paper;
        } else {
          watchSessionCosts.forEach(cost => {
            sessionCostsTotal += COST_ASSUMPTIONS.sessionCosts[cost];
          });
        }
      }
      
      // Other costs
      const otherCostsTotal = watchOtherCosts || 0;
      
      // Calculate total
      const total = perDiemTotal + accommodationTotal + venueTotal + 
                   transportTotal + participantCostsTotal + 
                   sessionCostsTotal + otherCostsTotal;
      
      setValue('totalBudget', total);
      return total;
    };

    calculateTotalBudget();
  }, [
    watchLocation, watchDays, watchParticipants, watchTransportRequired,
    watchLandTransport, watchAirTransport, watchParticipantCosts,
    watchSessionCosts, watchOtherCosts, setValue
  ]);

  const handleFormSubmit = async (data: MeetingWorkshopCost) => {
    try {
      setIsCalculating(true);
      setError(null);
      
      const totalBudget = watch('totalBudget');
      
      if (!totalBudget || totalBudget <= 0) {
        setError('Total budget must be greater than 0');
        return;
      }

      // Validate transport participants
      if (watchTransportRequired) {
        const totalTransport = (Number(watchLandTransport) || 0) + (Number(watchAirTransport) || 0);
        if (totalTransport > (watchParticipants || 0)) {
          setError('Total transport participants cannot exceed total participants');
          return;
        }
      }

      const meetingWorkshopCosts: MeetingWorkshopCost = {
        ...data,
        totalBudget: totalBudget || 0
      };
      
      onCalculate(meetingWorkshopCosts);
    } catch (error: any) {
      console.error('Failed to process costs:', error);
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
            {activityType} Cost Calculator
          </h3>
          <p className="text-sm text-blue-600">
            Fill in the {activityType.toLowerCase()} details below to calculate the total budget.
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
          Description of {activityType} Activity
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder={`Describe what will be covered in this ${activityType.toLowerCase()}...`}
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
            placeholder="Enter number of days"
          />
          {errors.numberOfDays && (
            <p className="mt-1 text-sm text-red-600">{errors.numberOfDays.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Number of Participants
          </label>
          <input
            type="number"
            min="1"
            {...register('numberOfParticipants', {
              required: 'Number of participants is required',
              min: { value: 1, message: 'Minimum 1 participant required' },
              valueAsNumber: true
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter number of participants"
          />
          {errors.numberOfParticipants && (
            <p className="mt-1 text-sm text-red-600">{errors.numberOfParticipants.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <select
          {...register('location', { required: 'Location is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {TRAINING_LOCATIONS.map(location => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
        {errors.location && (
          <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Additional Cost per Participant
        </label>
        <Controller
          name="additionalParticipantCosts"
          control={control}
          render={({ field }) => (
            <div className="mt-2 space-y-2">
              {PARTICIPANT_COSTS.map(cost => (
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
          Additional Cost per Session
        </label>
        <Controller
          name="additionalSessionCosts"
          control={control}
          render={({ field }) => (
            <div className="mt-2 space-y-2">
              {SESSION_COSTS.map(cost => (
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
              Number of Participants (Land Transport)
            </label>
            <input
              type="number"
              min="0"
              {...register('landTransportParticipants', {
                min: { value: 0, message: 'Cannot be negative' },
                valueAsNumber: true,
                validate: value => {
                  const airParticipants = Number(watchAirTransport) || 0;
                  const total = (Number(value) || 0) + airParticipants;
                  return total <= (watchParticipants || 0) || 
                    `Total transport participants (${total}) cannot exceed total participants (${watchParticipants})`;
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter number of participants"
            />
            {errors.landTransportParticipants && (
              <p className="mt-1 text-sm text-red-600">{errors.landTransportParticipants.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Number of Participants (Air Transport)
            </label>
            <input
              type="number"
              min="0"
              {...register('airTransportParticipants', {
                min: { value: 0, message: 'Cannot be negative' },
                valueAsNumber: true,
                validate: value => {
                  const landParticipants = Number(watchLandTransport) || 0;
                  const total = (Number(value) || 0) + landParticipants;
                  return total <= (watchParticipants || 0) || 
                    `Total transport participants (${total}) cannot exceed total participants (${watchParticipants})`;
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter number of participants"
            />
            {errors.airTransportParticipants && (
              <p className="mt-1 text-sm text-red-600">{errors.airTransportParticipants.message}</p>
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
            <span className="text-lg font-medium text-gray-900">Total Budget</span>
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

export default MeetingWorkshopCostingTool;