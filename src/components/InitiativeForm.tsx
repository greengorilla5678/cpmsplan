import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { PlusCircle, Save, Edit, Loader } from 'lucide-react';
import type { StrategicInitiative } from '../types/organization';

interface InitiativeFormProps {
  parentId: string;
  parentType: 'objective' | 'program' | 'subprogram';
  parentWeight: number;
  currentTotal: number;
  onSubmit: (data: Partial<StrategicInitiative>) => Promise<void>;
  initialData?: StrategicInitiative;
}

const InitiativeForm: React.FC<InitiativeFormProps> = ({
  parentId,
  parentType,
  parentWeight,
  currentTotal,
  onSubmit,
  initialData,
}) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingInitiatives, setPendingInitiatives] = useState<Partial<StrategicInitiative>[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<Partial<StrategicInitiative>>({
    defaultValues: initialData || {
      name: '',
      weight: 0,
      strategic_objective: parentType === 'objective' ? parentId : null,
      program: parentType === 'program' ? parentId : null,
      subprogram: parentType === 'subprogram' ? parentId : null
    },
  });

  // Calculate available weight considering current total and initial data
  const availableWeight = parentWeight - currentTotal + (initialData?.weight || 0);
  const pendingWeight = pendingInitiatives.reduce((sum, init) => sum + (Number(init.weight) || 0), 0);
  const remainingWeight = availableWeight - pendingWeight;

  const validateWeight = (weight: number, excludeIndex?: number): boolean => {
    // Calculate total weight of pending initiatives excluding the one being edited
    const totalPendingWeight = pendingInitiatives.reduce((sum, init, index) => {
      if (excludeIndex !== undefined && index === excludeIndex) {
        return sum;
      }
      return sum + (Number(init.weight) || 0);
    }, 0);

    // Add the new weight to get total
    const newTotal = totalPendingWeight + weight;
    
    // Check if total exceeds parent weight
    return newTotal <= availableWeight;
  };

  const handleFormSubmit = async (data: Partial<StrategicInitiative>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const weight = Number(data.weight);
      if (!validateWeight(weight)) {
        setError(`Total weight cannot exceed ${availableWeight}%`);
        return;
      }

      const initiativeData = {
        name: data.name,
        weight,
        strategic_objective: parentType === 'objective' ? parentId : null,
        program: parentType === 'program' ? parentId : null,
        subprogram: parentType === 'subprogram' ? parentId : null
      };

      await onSubmit(initiativeData);
      reset();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save initiative');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInitiative = handleSubmit((data) => {
    setError(null);
    const weight = Number(data.weight);

    // Validate weight including existing pending initiatives
    if (!validateWeight(weight, editingIndex)) {
      setError(`Total weight cannot exceed ${availableWeight}%`);
      return;
    }

    const newInitiative = {
      name: data.name,
      weight,
      strategic_objective: parentType === 'objective' ? parentId : null,
      program: parentType === 'program' ? parentId : null,
      subprogram: parentType === 'subprogram' ? parentId : null
    };
    
    if (editingIndex !== null) {
      const updatedInitiatives = [...pendingInitiatives];
      updatedInitiatives[editingIndex] = newInitiative;
      setPendingInitiatives(updatedInitiatives);
      setEditingIndex(null);
    } else {
      setPendingInitiatives([...pendingInitiatives, newInitiative]);
    }
    
    reset({
      name: '',
      weight: 0,
      strategic_objective: parentType === 'objective' ? parentId : null,
      program: parentType === 'program' ? parentId : null,
      subprogram: parentType === 'subprogram' ? parentId : null
    });
  });

  const handleEditPending = (index: number) => {
    const initiative = pendingInitiatives[index];
    setValue('name', initiative.name || '');
    setValue('weight', initiative.weight || 0);
    setEditingIndex(index);
    setError(null);
  };

  const handleRemovePending = (index: number) => {
    setPendingInitiatives(pendingInitiatives.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      reset({
        name: '',
        weight: 0,
        strategic_objective: parentType === 'objective' ? parentId : null,
        program: parentType === 'program' ? parentId : null,
        subprogram: parentType === 'subprogram' ? parentId : null
      });
    }
    setError(null);
  };

  const handleSubmitAll = async () => {
    if (pendingInitiatives.length === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      // Submit all pending initiatives sequentially
      for (const initiative of pendingInitiatives) {
        await onSubmit(initiative);
      }
      // Clear pending initiatives after successful submission
      setPendingInitiatives([]);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save initiatives');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Weight Summary</h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm text-gray-500">Parent Weight</p>
            <p className="text-lg font-semibold text-gray-900">{parentWeight}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Allocated</p>
            <p className="text-lg font-semibold text-blue-600">{currentTotal}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-lg font-semibold text-green-600">{availableWeight}%</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('planning.initiativeName')}
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
          {t('planning.weight')} (Max: {remainingWeight}%)
        </label>
        <input
          type="number"
          step="0.01"
          {...register('weight', {
            required: t('planning.weightRequired'),
            min: { value: 0.01, message: t('planning.weightMin') },
            max: { value: remainingWeight, message: t('planning.weightMax') },
            valueAsNumber: true
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.weight && (
          <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
        )}
      </div>

      <div className="flex space-x-2">
        {initialData ? (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('common.update')}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddInitiative}
            disabled={isSubmitting}
            className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {editingIndex !== null ? t('planning.updateInitiative') : t('planning.addInitiative')}
          </button>
        )}
      </div>

      {!initialData && pendingInitiatives.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-900 mb-2">{t('planning.pendingInitiatives')}</h3>
          <div className="space-y-2">
            {pendingInitiatives.map((initiative, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-800">{initiative.name}</p>
                  <p className="text-sm text-gray-500">{t('planning.weight')}: {initiative.weight}%</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditPending(index)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePending(index)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 flex justify-between">
              <span>{t('planning.totalWeight')}:</span>
              <span className="font-medium">{pendingWeight}%</span>
            </p>
            <p className="text-sm text-blue-700 flex justify-between">
              <span>{t('planning.remainingWeight')}:</span>
              <span className="font-medium">{remainingWeight}%</span>
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleSubmitAll}
            disabled={isSubmitting || pendingInitiatives.length === 0}
            className="w-full mt-4 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {t('planning.savingInitiatives')}
              </span>
            ) : (
              <span className="flex items-center">
                <Save className="h-4 w-4 mr-2" />
                {t('planning.saveAllInitiatives')}
              </span>
            )}
          </button>
        </div>
      )}
    </form>
  );
};

export default InitiativeForm;