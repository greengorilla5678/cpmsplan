import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, FileSpreadsheet, File as FilePdf, ArrowLeft, AlertCircle, Loader, Building2, Calendar, User, CheckCircle, XCircle, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { plans, organizations, auth } from '../lib/api';
import { format } from 'date-fns';
import { exportToExcel, exportToPDF } from '../lib/utils/export';
import PlanReviewForm from '../components/PlanReviewForm';
import Cookies from 'js-cookie';
import axios from 'axios';

const PlanSummary: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { planId } = useParams();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [processedPlanData, setProcessedPlanData] = useState<any>(null);

  // Fetch CSRF token and check authentication on component mount
  useEffect(() => {
    const ensureAuth = async () => {
      try {
        // Check if user is authenticated
        const authData = await auth.getCurrentUser();
        if (!authData.isAuthenticated) {
          navigate('/login');
        }
        
        // Force a new CSRF token to be set
        const response = await axios.get('/api/auth/csrf/', { withCredentials: true });
        const token = response.headers['x-csrftoken'] || Cookies.get('csrftoken');
        
        if (token) {
          Cookies.set('csrftoken', token, { path: '/' });
          console.log('CSRF token refreshed');
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
      }
    };
    
    ensureAuth();
  }, [navigate]);

  // Fetch organization data to resolve names
  const { data: organizationsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      try {
        const response = await organizations.getAll();
        return response.data || [];
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch plan data
  const { data: planData, isLoading, error, refetch } = useQuery({
    queryKey: ['plan', planId, retryCount], // Add retryCount to force refetch
    queryFn: async () => {
      if (!planId) {
        throw new Error("Plan ID is missing");
      }
      
      console.log(`Fetching plan with ID: ${planId}`);
      try {
        // Ensure fresh CSRF token
        await auth.getCurrentUser();
        
        // First attempt: Direct axios call
        const timestamp = new Date().getTime();
        try {
          console.log("First attempt: Direct axios call");
          const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-CSRFToken': Cookies.get('csrftoken') || '',
            'Accept': 'application/json'
          };
          
          const response = await axios.get(`/api/plans/${planId}/?_=${timestamp}`, { 
            headers,
            withCredentials: true,
            timeout: 10000 // 10 second timeout
          });
          
          console.log("Plan data retrieved via direct axios:", response.data);
          
          if (!response.data) {
            throw new Error("No data received from server (direct axios)");
          }
          
          return normalizeAndProcessPlanData(response.data);
        } catch (directError) {
          console.error("Direct axios approach failed:", directError);
          
          // Second attempt: Use plans service
          console.log("Second attempt: Using plans.getById service");
          const planResult = await plans.getById(planId);
          
          if (!planResult) {
            throw new Error("No data received from server (plans service)");
          }
          
          return planResult;
        }
      } catch (error: any) {
        console.error("All attempts to fetch plan failed:", error);
        setLoadingError(error.message || "Failed to load plan details after multiple attempts");
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    staleTime: 0 // Don't cache
  });

  // Normalize and process plan data to ensure correct structure
  const normalizeAndProcessPlanData = (plan: any) => {
    if (!plan) return plan;
    
    // Deep clone the plan to avoid modifying the original
    const processedPlan = JSON.parse(JSON.stringify(plan));
    console.log("Processing plan data:", processedPlan);
    
    try {
      // Ensure objectives is an array
      if (!Array.isArray(processedPlan.objectives)) {
        console.log('Objectives is not an array, converting:', processedPlan.objectives);
        processedPlan.objectives = processedPlan.objectives ? 
          (Array.isArray(processedPlan.objectives) ? processedPlan.objectives : [processedPlan.objectives]) : [];
      }
      
      // Process each objective
      processedPlan.objectives = processedPlan.objectives.map((objective: any) => {
        if (!objective) return objective;
        
        // Ensure initiatives is an array
        if (!Array.isArray(objective.initiatives)) {
          console.log('Initiatives is not an array for objective:', objective.id);
          objective.initiatives = objective.initiatives ? 
            (Array.isArray(objective.initiatives) ? objective.initiatives : [objective.initiatives]) : [];
        }
        
        // Process each initiative
        objective.initiatives = objective.initiatives.map((initiative: any) => {
          if (!initiative) return initiative;
          
          // Ensure performance_measures is an array
          if (!Array.isArray(initiative.performance_measures)) {
            console.log('Performance measures is not an array for initiative:', initiative.id);
            initiative.performance_measures = initiative.performance_measures ? 
              (Array.isArray(initiative.performance_measures) ? initiative.performance_measures : [initiative.performance_measures]) : [];
          }
          
          // Ensure main_activities is an array
          if (!Array.isArray(initiative.main_activities)) {
            console.log('Main activities is not an array for initiative:', initiative.id);
            initiative.main_activities = initiative.main_activities ? 
              (Array.isArray(initiative.main_activities) ? initiative.main_activities : [initiative.main_activities]) : [];
          }
          
          // Process each activity
          initiative.main_activities = initiative.main_activities.map((activity: any) => {
            if (!activity) return activity;
            
            // Ensure selected_months and selected_quarters are arrays
            if (!Array.isArray(activity.selected_months)) {
              activity.selected_months = activity.selected_months ? 
                (Array.isArray(activity.selected_months) ? activity.selected_months : [activity.selected_months]) : [];
            }
            
            if (!Array.isArray(activity.selected_quarters)) {
              activity.selected_quarters = activity.selected_quarters ? 
                (Array.isArray(activity.selected_quarters) ? activity.selected_quarters : [activity.selected_quarters]) : [];
            }
            
            return activity;
          });
          
          return initiative;
        });
        
        return objective;
      });
      
      // Ensure reviews is an array
      if (!Array.isArray(processedPlan.reviews)) {
        processedPlan.reviews = processedPlan.reviews ? 
          (Array.isArray(processedPlan.reviews) ? processedPlan.reviews : [processedPlan.reviews]) : [];
      }
      
    } catch (e) {
      console.error('Error normalizing plan data:', e);
    }
    
    return processedPlan;
  };

  // When plan data changes, update processed data and organization name
  useEffect(() => {
    if (planData) {
      // Set processed plan data
      setProcessedPlanData(planData);
      console.log("Setting processed plan data:", planData);
      
      // Update organization name
      if (organizationsData) {
        try {
          // First try to get the name from the API response
          if (planData.organizationName) {
            console.log("Using organization name from API:", planData.organizationName);
            setOrganizationName(planData.organizationName);
            return;
          }
          
          // If not found, try to resolve from the organization ID
          if (planData.organization) {
            console.log("Looking up organization by ID:", planData.organization);
            const org = organizationsData.find((o: any) => 
              o.id.toString() === planData.organization.toString());
            
            if (org) {
              console.log("Found organization by ID:", org.name);
              setOrganizationName(org.name);
              return;
            }
          }
          
          // Default fallback
          console.log("Using fallback for organization name");
          setOrganizationName('Unknown Organization');
        } catch (e) {
          console.error("Error resolving organization name:", e);
          setOrganizationName('Unknown Organization');
        }
      }
    }
  }, [planData, organizationsData]);

  const handleRetry = async () => {
    setLoadingError(null);
    setRetryCount(prev => prev + 1);
    
    try {
      // Ensure auth is fresh before retrying
      await auth.getCurrentUser();
      await refetch();
    } catch (error) {
      console.error("Retry failed:", error);
      setLoadingError("Failed to reload plan. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-6 w-6 animate-spin mr-2 text-green-600" />
        <span className="text-lg">Loading plan details...</span>
      </div>
    );
  }

  if (error || loadingError) {
    const errorMessage = loadingError || (error instanceof Error ? error.message : "An unknown error occurred");
    
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800">Failed to load plan</h3>
        <p className="text-red-600 mt-2">{errorMessage}</p>
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-white border border-red-300 rounded-md text-red-700 hover:bg-red-50"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800">Plan Not Found</h3>
        <p className="text-yellow-600 mt-2">The requested plan could not be found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Use processed plan data
  const planDataToUse = processedPlanData || planData;

  const handleExportExcel = () => {
    if (!planDataToUse || !planDataToUse.objectives || !Array.isArray(planDataToUse.objectives)) return;
    const data = formatDataForExport(planDataToUse.objectives);
    exportToExcel(data, `plan-${planId}-${new Date().toISOString()}`);
  };

  const handleExportPDF = () => {
    if (!planDataToUse || !planDataToUse.objectives || !Array.isArray(planDataToUse.objectives)) return;
    const data = formatDataForExport(planDataToUse.objectives);
    exportToPDF(data, `plan-${planId}-${new Date().toISOString()}`);
  };

  const formatDataForExport = (objectives: any[]) => {
    const data: any[] = [];
    
    // Check if objectives is an array before iterating
    if (!Array.isArray(objectives)) {
      console.error('objectives is not an array:', objectives);
      return data;
    }
    
    objectives.forEach((objective, objIndex) => {
      if (!objective) return; // Skip null/undefined objectives
      
      const initiatives = Array.isArray(objective.initiatives) ? objective.initiatives : [];
      
      if (initiatives.length === 0) {
        // Add at least one row for the objective
        data.push({
          'No': (objIndex + 1).toString(),
          'Strategic Objective': objective.title || 'Untitled Objective',
          'Initiative': '',
          'Performance Measure/Main Activity': '',
          'Type': '',
          'Weight': `${objective.weight || 0}%`,
          'Baseline': 'N/A',
          'Target': 'N/A',
          'Period': 'N/A',
          'Implementor Team/Desk': 'N/A',
          'Budget': 'N/A'
        });
        return;
      }
      
      initiatives.forEach((initiative: any) => {
        if (!initiative) return; // Skip null/undefined initiatives
        
        const measures = Array.isArray(initiative.performance_measures) ? initiative.performance_measures : [];
        const activities = Array.isArray(initiative.main_activities) ? initiative.main_activities : [];
        const maxItems = Math.max(measures.length, activities.length);

        if (maxItems === 0) {
          // Add at least one row for the initiative even if it has no measures or activities
          data.push({
            'No': (objIndex + 1).toString(),
            'Strategic Objective': objective.title || 'Untitled Objective',
            'Initiative': initiative.name || 'Untitled Initiative',
            'Performance Measure/Main Activity': '',
            'Type': '',
            'Weight': `${initiative.weight || 0}%`,
            'Baseline': 'N/A',
            'Target': 'N/A',
            'Period': 'N/A',
            'Implementor Team/Desk': 'N/A',
            'Budget': 'N/A'
          });
          return;
        }

        Array.from({ length: maxItems }).forEach((_, itemIndex) => {
          const measure = measures[itemIndex];
          const activity = activities[itemIndex];

          data.push({
            'No': itemIndex === 0 ? (objIndex + 1).toString() : '',
            'Strategic Objective': itemIndex === 0 ? (objective.title || 'Untitled Objective') : '',
            'Initiative': itemIndex === 0 ? (initiative.name || 'Untitled Initiative') : '',
            'Performance Measure/Main Activity': measure ? (measure.name || 'Untitled Measure') : activity ? (activity.name || 'Untitled Activity') : '',
            'Type': measure ? 'Performance Measure' : activity ? 'Main Activity' : '',
            'Weight': measure ? `${measure.weight || 0}%` : activity ? `${activity.weight || 0}%` : '',
            'Baseline': measure ? (measure.baseline || 'N/A') : 'N/A',
            'Target': measure ? {
              annual: measure.annual_target || 0,
              q1: measure.q1_target || 0,
              q2: measure.q2_target || 0,
              q3: measure.q3_target || 0,
              q4: measure.q4_target || 0
            } : 'N/A',
            'Period': activity ? (
              Array.isArray(activity.selected_quarters) && activity.selected_quarters.length > 0 
                ? activity.selected_quarters
                : Array.isArray(activity.selected_months) ? activity.selected_months : []
            ) : 'N/A',
            'Implementor Team/Desk': activity ? 'ICT Executive Office' : 'N/A',
            'Budget': activity?.budget ? {
              total: Number(activity.budget.budget_calculation_type === 'WITH_TOOL' 
                ? activity.budget.estimated_cost_with_tool || 0
                : activity.budget.estimated_cost_without_tool || 0),
              treasury: Number(activity.budget.government_treasury || 0),
              sdg: Number(activity.budget.sdg_funding || 0),
              partners: Number(activity.budget.partners_funding || 0),
              other: Number(activity.budget.other_funding || 0)
            } : 'N/A'
          });
        });
      });
    });

    return data;
  };

  // Calculate total budget across all objectives
  const calculateTotalBudget = () => {
    let total = 0;
    let governmentTotal = 0;
    let sdgTotal = 0;
    let partnersTotal = 0;
    let otherTotal = 0;

    if (!planDataToUse || !planDataToUse.objectives) {
      return { total, governmentTotal, sdgTotal, partnersTotal, otherTotal };
    }

    // Check if objectives is an array before iterating
    if (!Array.isArray(planDataToUse.objectives)) {
      console.error('planData.objectives is not an array:', planDataToUse.objectives);
      return { total, governmentTotal, sdgTotal, partnersTotal, otherTotal };
    }

    try {
      planDataToUse.objectives.forEach((objective: any) => {
        if (!objective || !objective.initiatives) return;
        
        // Check if initiatives is an array before iterating
        if (!Array.isArray(objective.initiatives)) return;
        
        objective.initiatives.forEach((initiative: any) => {
          if (!initiative || !initiative.main_activities) return;
          
          // Check if main_activities is an array before iterating
          if (!Array.isArray(initiative.main_activities)) return;
          
          initiative.main_activities.forEach((activity: any) => {
            if (!activity || !activity.budget) return;
            
            try {
              const cost = activity.budget.budget_calculation_type === 'WITH_TOOL' 
                ? Number(activity.budget.estimated_cost_with_tool || 0) 
                : Number(activity.budget.estimated_cost_without_tool || 0);
              
              total += cost;
              governmentTotal += Number(activity.budget.government_treasury || 0);
              sdgTotal += Number(activity.budget.sdg_funding || 0);
              partnersTotal += Number(activity.budget.partners_funding || 0);
              otherTotal += Number(activity.budget.other_funding || 0);
            } catch (e) {
              console.error('Error processing activity budget:', e, activity);
            }
          });
        });
      });
    } catch (e) {
      console.error('Error calculating total budget:', e);
    }

    return { total, governmentTotal, sdgTotal, partnersTotal, otherTotal };
  };

  const budgetTotals = calculateTotalBudget();

  const handleApprove = async () => {
    // Ensure user is authenticated before opening review form
    try {
      await auth.getCurrentUser();
      setShowReviewForm(true);
    } catch (error) {
      console.error('Failed to verify authentication:', error);
      setLoadingError('Authentication error. Please try again.');
    }
  };

  const handleReviewSubmit = async (data: { status: 'APPROVED' | 'REJECTED'; feedback: string }) => {
    if (!planId) return;
    
    setIsSubmitting(true);
    try {
      // Ensure CSRF token is fresh
      await auth.getCurrentUser();
      const csrfToken = Cookies.get('csrftoken');
      
      // Make direct API call with explicit headers
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      if (data.status === 'APPROVED') {
        await axios.post(`/api/plans/${planId}/approve/`, 
          { feedback: data.feedback },
          { headers, withCredentials: true }
        );
      } else {
        await axios.post(`/api/plans/${planId}/reject/`, 
          { feedback: data.feedback },
          { headers, withCredentials: true }
        );
      }
      navigate('/evaluator');
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      setLoadingError(error.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
      setShowReviewForm(false);
    }
  };

  // Safe format function to handle potentially missing dates
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PP');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Safely get period string (months or quarters)
  const getPeriodString = (activity: any) => {
    if (!activity) return 'N/A';
    
    try {
      if (Array.isArray(activity.selected_quarters) && activity.selected_quarters.length > 0) {
        return activity.selected_quarters.join(', ');
      } 
      
      if (Array.isArray(activity.selected_months) && activity.selected_months.length > 0) {
        return activity.selected_months.join(', ');
      }
    } catch (e) {
      console.error('Error getting period string:', e);
    }
    
    return 'N/A';
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plan Details</h1>
            <div className="flex items-center mt-1">
              <div className={`px-2 py-1 text-xs rounded ${
                planDataToUse.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                planDataToUse.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                planDataToUse.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {planDataToUse.status}
              </div>
              {planDataToUse.submitted_at && (
                <span className="text-sm text-gray-500 ml-2">
                  Submitted on {formatDate(planDataToUse.submitted_at)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FilePdf className="h-4 w-4 mr-2" />
              Export PDF
            </button>

            {planDataToUse.status === 'SUBMITTED' && (
              <button
                onClick={handleApprove}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Review Plan
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Organization Info */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Organization Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Organization Name</p>
                  <p className="font-medium">{organizationName}</p>
                </div>
              </div>
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Planner</p>
                  <p className="font-medium">{planDataToUse.planner_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Planning Period</p>
                  <p className="font-medium">
                    {formatDate(planDataToUse.from_date)} - {formatDate(planDataToUse.to_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          {planDataToUse.reviews && planDataToUse.reviews.length > 0 && (
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Evaluator Feedback</h2>
              <div className={`p-4 rounded-lg ${
                planDataToUse.status === 'APPROVED' ? 'bg-green-50 border border-green-200' : 
                planDataToUse.status === 'REJECTED' ? 'bg-red-50 border border-red-200' : 
                'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-start">
                  {planDataToUse.status === 'APPROVED' ? (
                    <CheckCircle className={`h-5 w-5 mr-2 text-green-500 mt-0.5`} />
                  ) : planDataToUse.status === 'REJECTED' ? (
                    <XCircle className={`h-5 w-5 mr-2 text-red-500 mt-0.5`} />
                  ) : (
                    <div className="h-5 w-5 mr-2" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      planDataToUse.status === 'APPROVED' ? 'text-green-700' : 
                      planDataToUse.status === 'REJECTED' ? 'text-red-700' : 
                      'text-gray-700'
                    }`}>
                      {planDataToUse.status === 'APPROVED' ? 'Plan Approved' : 
                       planDataToUse.status === 'REJECTED' ? 'Plan Rejected' :
                       'Pending Review'}
                    </p>
                    {planDataToUse.reviews[0]?.feedback && (
                      <p className="mt-1 text-gray-600">
                        {planDataToUse.reviews[0].feedback}
                      </p>
                    )}
                    {planDataToUse.reviews[0]?.reviewed_at && (
                      <p className="mt-2 text-sm text-gray-500">
                        Reviewed on {formatDate(planDataToUse.reviews[0].reviewed_at)} by {planDataToUse.reviews[0].evaluator_name || 'Evaluator'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Total Objectives</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {Array.isArray(planDataToUse.objectives) ? planDataToUse.objectives.length : 0}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Total Initiatives</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {Array.isArray(planDataToUse.objectives) ? planDataToUse.objectives.reduce((total, obj) => 
                  Array.isArray(obj?.initiatives) ? total + obj.initiatives.length : total, 0) : 0}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Total Activities</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {Array.isArray(planDataToUse.objectives) ? planDataToUse.objectives.reduce((total, obj) => {
                  if (!Array.isArray(obj?.initiatives)) return total;
                  return total + obj.initiatives.reduce((sum, init) => {
                    if (!Array.isArray(init?.main_activities)) return sum;
                    return sum + init.main_activities.length;
                  }, 0);
                }, 0) : 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-500">Total Budget</h3>
                <p className="mt-2 text-3xl font-semibold text-green-600">
                  ${budgetTotals.total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Strategic Objectives */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Strategic Objectives</h2>
            {!Array.isArray(planDataToUse.objectives) || planDataToUse.objectives.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">No strategic objectives found for this plan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {planDataToUse.objectives.map((objective: any, index: number) => (
                  <div key={objective?.id || `obj-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{objective?.title || 'Untitled Objective'}</h3>
                        <p className="text-sm text-gray-500">{objective?.description || 'No description'}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {objective?.weight || 0}%
                      </span>
                    </div>

                    {/* Initiatives */}
                    {(!Array.isArray(objective?.initiatives) || objective.initiatives.length === 0) ? (
                      <div className="ml-4 mt-3 text-sm text-gray-500 italic">No initiatives found for this objective</div>
                    ) : (
                      <div className="ml-4 mt-4 space-y-3">
                        {objective.initiatives.map((initiative: any, initIndex: number) => (
                          <div key={initiative?.id || `init-${initIndex}`} className="border-l-2 border-gray-200 pl-4">
                            <h4 className="font-medium text-gray-900">{initiative?.name || 'Untitled Initiative'}</h4>
                            <p className="text-sm text-gray-600 mt-1">Weight: {initiative?.weight || 0}%</p>
                            
                            {/* Performance Measures */}
                            {Array.isArray(initiative?.performance_measures) && initiative.performance_measures.length > 0 ? (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-gray-700">Performance Measures</h5>
                                <div className="mt-2 space-y-2 pl-2">
                                  {initiative.performance_measures.map((measure: any, measureIndex: number) => (
                                    <div key={measure?.id || `measure-${measureIndex}`} className="text-sm bg-blue-50 p-3 rounded-lg">
                                      <p className="text-gray-900 font-medium">{measure?.name || 'Untitled Measure'}</p>
                                      <div className="flex items-center">
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                          {measure?.weight || 0}%
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs text-gray-500">
                                        <div>Baseline: {measure?.baseline || 'N/A'}</div>
                                        <div>Annual Target: {measure?.annual_target || 0}</div>
                                        <div>Q1: {measure?.q1_target || 0}</div>
                                        <div>Q2: {measure?.q2_target || 0}</div>
                                        <div>Q3: {measure?.q3_target || 0}</div>
                                        <div>Q4: {measure?.q4_target || 0}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-gray-500 italic pl-2">No performance measures</div>
                            )}

                            {/* Main Activities */}
                            {Array.isArray(initiative?.main_activities) && initiative.main_activities.length > 0 ? (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-gray-700">Main Activities</h5>
                                <div className="mt-2 space-y-2 pl-2">
                                  {initiative.main_activities.map((activity: any, actIndex: number) => (
                                    <div key={activity?.id || `activity-${actIndex}`} className="text-sm bg-green-50 p-3 rounded-lg">
                                      <p className="text-gray-900 font-medium">{activity?.name || 'Untitled Activity'}</p>
                                      <div className="flex items-center">
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                          {activity?.weight || 0}%
                                        </span>
                                      </div>
                                      <div className="mt-2 text-xs">
                                        <p className="text-gray-600">
                                          Period: {getPeriodString(activity)}
                                        </p>
                                        {activity?.budget && (
                                          <div className="mt-1 grid grid-cols-2 gap-2">
                                            <p className="text-gray-600">
                                              Budget: ${(activity.budget.budget_calculation_type === 'WITH_TOOL' 
                                                ? Number(activity.budget.estimated_cost_with_tool || 0) 
                                                : Number(activity.budget.estimated_cost_without_tool || 0)).toLocaleString()}
                                            </p>
                                            <p className="text-gray-600">
                                              Funding: ${(
                                                Number(activity.budget.government_treasury || 0) +
                                                Number(activity.budget.sdg_funding || 0) +
                                                Number(activity.budget.partners_funding || 0) +
                                                Number(activity.budget.other_funding || 0)
                                              ).toLocaleString()}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-gray-500 italic pl-2">No main activities</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Review Plan: {organizationName}
            </h3>
            
            <PlanReviewForm
              plan={planDataToUse}
              onSubmit={handleReviewSubmit}
              onCancel={() => setShowReviewForm(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSummary;