import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Calculator, DollarSign, Info, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { ProcurementCost } from '../types/costing';
import { PROCUREMENT_ITEMS } from '../types/costing';

interface ProcurementCostingToolProps {
  onCalculate: (costs: ProcurementCost) => void;
  onCancel: () => void;
  initialData?: ProcurementCost;
}

const ProcurementCostingTool: React.FC<ProcurementCostingToolProps> = ({ 
  onCalculate, 
  onCancel,
  initialData 
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm<ProcurementCost>({
    defaultValues: initialData || {
      description: '',
      items: [{ itemType: PROCUREMENT_ITEMS[0].value, quantity: 1 }],
      otherCosts: 0
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch('items');
  const watchOtherCosts = watch('otherCosts');

  useEffect(() => {
    const calculateTotalBudget = () => {
      // Calculate items cost
      const itemsTotal = watchItems?.reduce((sum, item) => {
        const itemConfig = PROCUREMENT_ITEMS.find(i => i.value === item.itemType);
        return sum + (item.quantity * (itemConfig?.defaultPrice || 0));
      }, 0) || 0;
      
      // Add other costs
      const otherCostsTotal = Number(watchOtherCosts) || 0;
      
      // Calculate total
      const total = itemsTotal + otherCostsTotal;
      
      setValue('totalBudget', total);
      return total;
    };

    calculateTotalBudget();
  }, [watchItems, watchOtherCosts, setValue]);

  const handleFormSubmit = async (data: ProcurementCost) => {
    try {
      setIsCalculating(true);
      setError(null);
      
      const totalBudget = watch('totalBudget');
      
      if (!totalBudget || totalBudget <= 0) {
        setError('Total budget must be greater than 0');
        return;
      }
      
      const procurementCosts: ProcurementCost = {
        ...data,
        totalBudget: totalBudget || 0,
        items: watchItems || []
      };
      
      onCalculate(procurementCosts);
    } catch (error: any) {
      console.error('Failed to process procurement costs:', error);
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
            Procurement Cost Calculator
          </h3>
          <p className="text-sm text-blue-600">
            Fill in the procurement details below to calculate the total budget.
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
          Description of Procurement Activity
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Describe the procurement activity..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Procurement Item List
          </label>
          <button
            type="button"
            onClick={() => append({ 
              itemType: PROCUREMENT_ITEMS[0].value,
              quantity: 1
            })}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => {
            const selectedItem = PROCUREMENT_ITEMS.find(
              item => item.value === watchItems?.[index]?.itemType
            );
            
            return (
              <div key={field.id} className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Specific List
                    </label>
                    <select
                      {...register(`items.${index}.itemType` as const, { 
                        required: 'Please select an item from the list' 
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {PROCUREMENT_ITEMS.map(item => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity` as const, {
                        required: 'Quantity is required',
                        min: { value: 1, message: 'Minimum 1 required' },
                        valueAsNumber: true
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-700 flex justify-between mt-1">
                      <span>Subtotal:</span>
                      <span>ETB {((watchItems?.[index]?.quantity || 0) * (selectedItem?.defaultPrice || 0)).toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

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
            <span className="text-lg font-medium text-gray-900">Procurement Budget</span>
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
          This total is calculated based on the selected items, quantities, and standard rates
        </p>
      </div>
    </form>
  );
};

export default ProcurementCostingTool;