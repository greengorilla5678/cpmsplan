import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Loader } from 'lucide-react';
import type { PerformanceMeasure } from '../types/organization';

interface PerformanceMeasureFormProps {
  initiativeId: string;
  currentTotal: number;
  onSubmit: (data: Partial<PerformanceMeasure>) => Promise<void>;
  initialData?: PerformanceMeasure | null;
  onCancel: () => void;
}

const PerformanceMeasureForm: React.FC<PerformanceMeasureFormProps> = ({
  initiativeId,
  currentTotal,
  onSubmit,
  initialData,
  onCancel
}) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Partial<PerformanceMeasure>>({
    defaultValues: initialData || {
      initiative: initiativeId,
      name: '',
      weight: 0,
      baseline: '',
      q1_target: 0,
      q2_target: 0,
      q3_target: 0,
      q4_target: 0,
      annual_target: 0
    },
  });

  const maxWeight = 35 - currentTotal + (initialData?.weight || 0);
  
  // Watch quarterly targets and annual target for validation
  const q1Target = watch('q1_target') || 0;
  const q2Target = watch('q2_target') || 0;
  const q3Target = watch('q3_target') || 0;
  const q4Target = watch('q4_target') || 0;
  const annualTarget = watch('annual_target') || 0;
  
  // Calculate 6-month target (Q1 + Q2)
  const sixMonthTarget = q1Target + q2Target;
  
  // Calculate yearly target (sum of all quarters)
  const calculatedYearlyTarget = q1Target + q2Target + q3Target + q4Target;

  const handleFormSubmit = async (data: Partial<PerformanceMeasure>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('planning.measureName')}
        </label>
        <input
          type="text"
          {...register('name', { required: t('planning.nameRequired') })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('planning.weight')} (Max: {maxWeight}%)
        </label>
        <input
          type="number"
          step="0.01"
          {...register('weight', {
            required: t('planning.weightRequired'),
            min: { value: 0.01, message: t('planning.weightMin') },
            max: { value: maxWeight, message: t('planning.weightMax') },
            valueAsNumber: true
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.weight && (
          <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('planning.baseline')}
        </label>
        <input
          type="text"
          {...register('baseline')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('planning.targets')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning.annualTarget')}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('annual_target', {
                required: true,
                min: 0,
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning.q1Target')}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('q1_target', {
                required: true,
                min: 0,
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning.q2Target')}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('q2_target', {
                required: true,
                min: 0,
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <label className="block text-sm font-medium text-blue-700">
              6 Month Target (Q1+Q2)
            </label>
            <div className="mt-1 text-lg font-medium text-blue-800">
              {sixMonthTarget}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning.q3Target')}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('q3_target', {
                required: true,
                min: 0,
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('planning.q4Target')}
            </label>
            <input
              type="number"
              step="0.01"
              {...register('q4_target', {
                required: true,
                min: 0,
                valueAsNumber: true
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Validation warning for quarterly targets vs annual target */}
        {calculatedYearlyTarget > annualTarget && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items- center gap-2 text-red-700">
            <p className="text-sm">
              {t('planning.targetExceedsAnnual')}. Sum of quarterly targets: {calculatedYearlyTarget}, Annual target: {annualTarget}
            </p>
          </div>
        )}
      </div>

      <input type="hidden" {...register('initiative')} value={initiativeId} />

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={calculatedYearlyTarget > annualTarget || isSubmitting}
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
  );
};

export default PerformanceMeasureForm;