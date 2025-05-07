import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Loader } from 'lucide-react';
import type { StrategicObjective } from '../types/organization';

interface ObjectiveFormProps {
  objective?: StrategicObjective | null;
  onSubmit: (data: Partial<StrategicObjective>) => Promise<void>;
  onCancel: () => void;
  currentTotalWeight?: number;
}

const ObjectiveForm: React.FC<ObjectiveFormProps> = ({
  objective,
  onSubmit,
  onCancel,
  currentTotalWeight = 0,
}) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<StrategicObjective>>({
    defaultValues: objective || {
      title: '',
      description: '',
      weight: 0
    },
  });

  // Calculate the required weight to reach 100%
  const requiredWeight = 100 - (currentTotalWeight - (objective?.weight || 0));

  const handleFormSubmit = async (data: Partial<StrategicObjective>) => {
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
          Title
        </label>
        <input
          type="text"
          {...register('title', { required: 'Title is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Weight (%) - Required weight to reach 100%: {requiredWeight}%
        </label>
        <input
          type="number"
          step="0.01"
          {...register('weight', {
            required: 'Weight is required',
            min: { value: 0, message: 'Weight must be greater than 0' },
            max: { value: 100, message: 'Weight cannot exceed 100' },
            valueAsNumber: true,
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        />
        {errors.weight && (
          <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
        )}
        
        {!objective && (
          <p className="mt-1 text-sm text-gray-500">
            The total weight of all strategic objectives must be exactly 100%. Current total: {currentTotalWeight}%
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </span>
          ) : (
            objective ? 'Update' : 'Create'
          )}
        </button>
      </div>
    </form>
  );
};

export default ObjectiveForm;