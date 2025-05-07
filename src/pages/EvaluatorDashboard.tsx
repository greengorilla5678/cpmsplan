import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Eye, Building2, CheckCircle, XCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { plans, auth, organizations, api } from '../lib/api';
import { format } from 'date-fns';
import PlanReviewForm from '../components/PlanReviewForm';
import { isEvaluator } from '../types/user';
import Cookies from 'js-cookie';

const EvaluatorDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [organizationsMap, setOrganizationsMap] = useState<Record<string, string>>({});

  // Check if user has evaluator permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const authData = await auth.getCurrentUser();
        if (!authData.isAuthenticated) {
          navigate('/login');
          return;
        }
        
        if (!isEvaluator(authData.userOrganizations)) {
          setError('You do not have permission to access the evaluator dashboard');
        }
      } catch (error) {
        console.error('Failed to check permissions:', error);
        setError('Failed to verify your permissions');
      }
    };
    
    checkPermissions();
  }, [navigate]);

  // Fetch all organizations to map IDs to names
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await organizations.getAll();
        const orgMap: Record<string, string> = {};
        
        if (response && response.data) {
          response.data.forEach((org: any) => {
            orgMap[org.id] = org.name;
          });
        }
        
        setOrganizationsMap(orgMap);
        console.log('Organizations map created:', orgMap);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      }
    };
    
    fetchOrganizations();
  }, []);

  // Fetch pending plans for review
  const { data: pendingPlans, isLoading, refetch } = useQuery({
    queryKey: ['plans', 'pending-reviews'],
    queryFn: async () => {
      console.log('Fetching pending plans for review...');
      try {
        // Ensure CSRF token is fresh
        await auth.getCurrentUser();
        
        const response = await plans.getPendingReviews();
        console.log('Pending plans response:', response);
        
        // Map organization IDs to names if needed
        if (response.data && Array.isArray(response.data)) {
          console.log('Processing plans to ensure organization names are available');
          response.data = response.data.map((plan: any) => {
            if (plan.organization && organizationsMap[plan.organization]) {
              plan.organizationName = organizationsMap[plan.organization];
            }
            return plan;
          });
        }
        
        return response;
      } catch (error) {
        console.error('Error fetching pending reviews:', error);
        throw error;
      }
    },
    retry: 2,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // Ensure CSRF token is fresh
      await auth.getCurrentUser();
      
      await refetch();
      setSuccess('Plans refreshed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to refresh plans');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Review mutation (approve or reject)
  const reviewMutation = useMutation({
    mutationFn: async (reviewData: { planId: string, status: 'APPROVED' | 'REJECTED', feedback: string }) => {
      // Ensure CSRF token is fresh
      await auth.getCurrentUser();
      
      try {
        if (reviewData.status === 'APPROVED') {
          // First try the API endpoint directly
          return await api.post(`/api/plans/${reviewData.planId}/approve/`, {
            feedback: reviewData.feedback
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': Cookies.get('csrftoken')
            }
          });
        } else {
          return await api.post(`/api/plans/${reviewData.planId}/reject/`, {
            feedback: reviewData.feedback
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': Cookies.get('csrftoken')
            }
          });
        }
      } catch (error) {
        console.error('Direct API error:', error);
        
        // Fall back to the API service methods
        if (reviewData.status === 'APPROVED') {
          return plans.approve(reviewData.planId);
        } else {
          return plans.reject(reviewData.planId, reviewData.feedback);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'pending-reviews'] });
      setShowReviewModal(false);
      setSelectedPlan(null);
      setSuccess('Plan review submitted successfully');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to submit review');
      setTimeout(() => setError(null), 5000);
    },
  });

  const handleViewPlan = async (plan: any) => {
    if (!plan || !plan.id) {
      setError('Invalid plan data for viewing');
      return;
    }
    
    console.log('Navigating to plan details:', plan.id);
    setError(null);
    
    try {
      // Ensure CSRF token is fresh
      await auth.getCurrentUser();
      
      // Prefetch the plan data with a fresh request to ensure it's in the cache
      await queryClient.prefetchQuery({
        queryKey: ['plan', plan.id],
        queryFn: () => plans.getById(plan.id),
        staleTime: 0
      });
      
      // Navigate to plan details
      navigate(`/plans/${plan.id}`);
    } catch (err) {
      console.error('Failed to prefetch plan data:', err);
      setError('Error loading plan. Attempting to navigate anyway.');
      
      // Navigate anyway, the component will handle loading state
      setTimeout(() => {
        navigate(`/plans/${plan.id}`);
      }, 500);
    }
  };

  const handleReviewPlan = async (plan: any) => {
    if (!plan || !plan.id) {
      setError('Invalid plan data for review');
      return;
    }
    
    try {
      // Ensure CSRF token is fresh
      await auth.getCurrentUser();
      console.log('Opening review modal for plan:', plan.id);
      setSelectedPlan(plan);
      setShowReviewModal(true);
    } catch (error) {
      console.error('Authentication failed:', error);
      setError('Failed to authenticate. Please try again.');
    }
  };

  const handleReviewSubmit = async (data: { status: 'APPROVED' | 'REJECTED'; feedback: string }) => {
    if (!selectedPlan) return;
    
    try {
      console.log(`Submitting review for plan ${selectedPlan.id} with status: ${data.status}`);
      
      // Ensure fresh CSRF token
      await auth.getCurrentUser();
      
      await reviewMutation.mutateAsync({
        planId: selectedPlan.id,
        status: data.status,
        feedback: data.feedback
      });
    } catch (error) {
      console.error('Failed to submit review:', error);
      // Error handled by mutation
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Helper function to get organization name from map or plan
  const getOrganizationName = (plan: any) => {
    if (plan.organizationName) {
      return plan.organizationName;
    }
    
    // Try to get organization name from our map
    if (plan.organization && organizationsMap[plan.organization]) {
      return organizationsMap[plan.organization];
    }
    
    return 'Unknown Organization';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-6 w-6 animate-spin mr-2 text-green-600" />
        <span className="text-lg">Loading pending plans...</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluator Dashboard</h1>
        <p className="text-gray-600">Review and approve submitted plans</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Pending Reviews</h3>
              <p className="mt-1 text-sm text-gray-500">
                View all plans submitted for review and their current status.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <div className="flex items-center">
                <Bell className="h-6 w-6 text-gray-400 mr-2" />
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingPlans?.data?.length || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex justify-end">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md disabled:opacity-50"
            >
              {isRefreshing ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh Plans
            </button>
          </div>

          {!pendingPlans?.data || pendingPlans.data.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No pending plans</h3>
              <p className="text-gray-500 max-w-lg mx-auto">
                There are no plans waiting for your review. Check back later or refresh to see if any new plans have been submitted.
              </p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md disabled:opacity-50"
              >
                {isRefreshing ? <Loader className="h-4 w-4 mr-2 inline-block animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2 inline-block" />}
                Check Again
              </button>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planning Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPlans.data.map((plan: any) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{getOrganizationName(plan)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.planner_name || 'Unknown Planner'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">
                            {plan.submitted_at ? formatDate(plan.submitted_at) : 'Not yet submitted'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.from_date && plan.to_date ? 
                          `${formatDate(plan.from_date)} - ${formatDate(plan.to_date)}` :
                          'Date not available'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewPlan(plan)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => handleReviewPlan(plan)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Review Plan: {getOrganizationName(selectedPlan)}
            </h3>
            
            <PlanReviewForm
              plan={selectedPlan}
              onSubmit={handleReviewSubmit}
              onCancel={() => {
                setShowReviewModal(false);
                setSelectedPlan(null);
              }}
              isSubmitting={reviewMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorDashboard;