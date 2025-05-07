import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Loader, Calendar, AlertCircle, ArrowLeft } from 'lucide-react';
import type { MainActivity } from '../types/plan';
import { MONTHS, QUARTERS, Month, Quarter } from '../types/plan';

interface MainActivityFormProps {
  initiativeId: string;
  currentTotal: number;
  onSubmit: (data: Partial<MainActivity>) => Promise<void>;
  initialData?: MainActivity | null;
  onCancel: () => void;
}

const MainActivityForm: React.FC<MainActivityFormProps> = ({
  initiativeId,
  currentTotal,
  onSubmit,
  initialData,
  onCancel
}) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determine initial period type based on existing data
  const [periodType, setPeriodType] = useState<'months' | 'quarters'>(
    initialData?.selected_quarters?.length ? 'quarters' : 'months'
  );
  
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<Partial<MainActivity>>({
    defaultValues: {
      initiative: initiativeId,
      name: initialData?.name || '',
      weight: initialData?.weight || 0,
      selected_months: initialData?.selected_months || [],
      selected_quarters: initialData?.selected_quarters || []
    }
  });

  const maxWeight = 65 - currentTotal + (initialData?.weight || 0);
  const selectedMonths = watch('selected_months') || [];
  const selectedQuarters = watch('selected_quarters') || [];
  const hasPeriodSelected = selectedMonths.length > 0 || selectedQuarters.length > 0;

  const handleFormSubmit = async (data: Partial<MainActivity>) => {
    if (!hasPeriodSelected) {
      setError('Please select at least one period');
      return;
    }

    if (!data.name?.trim()) {
      setError('Activity name is required');
      return;
    }

    if (!data.weight || data.weight <= 0 || data.weight > maxWeight) {
      setError(`Weight must be between 0 and ${maxWeight}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const activityData = {
        ...data,
        initiative: initiativeId,
        // Only include the selected period type's data
        selected_months: periodType === 'months' ? data.selected_months : [],
        selected_quarters: periodType === 'quarters' ? data.selected_quarters : [],
        // Preserve budget data if it exists
        budget: initialData?.budget
      };
      
      await onSubmit(activityData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to save activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePeriodType = () => {
    // Clear selections when switching period type
    if (periodType === 'months') {
      setValue('selected_months', []);
      setPeriodType('quarters');
    } else {
      setValue('selected_quarters', []);
      setPeriodType('months');
    }
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Back button if editing */}
      {initialData && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Activities
        </button>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('planning.activityName')}
          </label>
          <input
            type="text"
            {...register('name', { 
              required: 'Activity name is required',
              minLength: { value: 3, message: 'Name must be at least 3 characters' }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter activity name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('planning.weight')} (Max: {maxWeight}%)
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              step="0.01"
              {...register('weight', {
                required: 'Weight is required',
                min: { value: 0.01, message: 'Weight must be greater than 0' },
                max: { value: maxWeight, message: `Weight cannot exceed ${maxWeight}%` },
                valueAsNumber: true
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter weight percentage"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">%</span>
            </div>
          </div>
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                {t('planning.period')}
              </span>
            </label>
            <button
              type="button"
              onClick={togglePeriodType}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Switch to {periodType === 'months' ? 'Quarters' : 'Months'}
            </button>
          </div>

          {periodType === 'months' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MONTHS.map((month) => (
                <label
                  key={month.value}
                  className="relative flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-400 cursor-pointer"
                >
                  <Controller
                    name="selected_months"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        value={month.value}
                        checked={field.value?.includes(month.value)}
                        onChange={(e) => {
                          const value = e.target.value as Month;
                          const currentValues = field.value || [];
                          field.onChange(
                            e.target.checked
                              ? [...currentValues, value]
                              : currentValues.filter((v) => v !== value)
                          );
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    )}
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {month.label}
                    <span className="block text-xs text-gray-500">
                      {month.quarter}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {QUARTERS.map((quarter) => (
                <label
                  key={quarter.value}
                  className="relative flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-400 cursor-pointer"
                >
                  <Controller
                    name="selected_quarters"
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        value={quarter.value}
                        checked={field.value?.includes(quarter.value)}
                        onChange={(e) => {
                          const value = e.target.value as Quarter;
                          const currentValues = field.value || [];
                          field.onChange(
                            e.target.checked
                              ? [...currentValues, value]
                              : currentValues.filter((v) => v !== value)
                          );
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    )}
                  />
                  <span className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">
                      {quarter.label}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {quarter.months.join(', ')}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {!hasPeriodSelected && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
              Please select at least one {periodType === 'months' ? 'month' : 'quarter'}
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasPeriodSelected}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </span>
            ) : (
              initialData ? t('common.update') : t('common.create')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MainActivityForm;