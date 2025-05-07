import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Send, AlertCircle } from 'lucide-react';
import type { Plan } from '../types/plan';

interface PlanSubmitFormProps {
  plan: Plan;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const PlanSubmitForm: React.FC<PlanSubmitFormProps> = ({
  plan,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const { handleSubmit } = useForm();

  const handleFormSubmit = async () => {
    try {
      setError(null);
      await onSubmit();
    } catch (error: any) {
      setError(error.message || 'Failed to submit plan');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Submit Plan for Review
        </h3>
        <p className="text-sm text-yellow-700">
          Are you sure you want to submit this plan for review? Once submitted:
        </p>
        <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
          <li>The plan will be locked for editing</li>
          <li>Evaluators will be notified to review the plan</li>
          <li>You'll be notified when the review is complete</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Send className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PlanSubmitForm;