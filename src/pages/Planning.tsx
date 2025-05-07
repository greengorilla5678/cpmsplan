import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { objectives, initiatives, performanceMeasures, mainActivities, auth, organizations, plans } from '../lib/api';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { AlertCircle, PlusCircle, CheckCircle, Lock, Info, ArrowLeft, Send, X, FilePlus, FileText, Calendar, Building2, Clock } from 'lucide-react';
import type { StrategicObjective, StrategicInitiative, PerformanceMeasure, Organization, Program, SubProgram } from '../types/organization';
import type { MainActivity, PlanningPeriod, Plan } from '../types/plan';
import { AuthState, isAdmin, isPlanner } from '../types/user';
import InitiativeList from '../components/InitiativeList';
import InitiativeForm from '../components/InitiativeForm';
import ObjectiveForm from '../components/ObjectiveForm';
import PerformanceMeasureList from '../components/PerformanceMeasureList';
import PerformanceMeasureForm from '../components/PerformanceMeasureForm';
import MainActivityList from '../components/MainActivityList';
import MainActivityForm from '../components/MainActivityForm';
import PlanningHeader from '../components/PlanningHeader';
import StrategicObjectivesList from '../components/StrategicObjectivesList';
import PlanReviewTable from '../components/PlanReviewTable';
import { format } from 'date-fns';
import Cookies from 'js-cookie';
import axios from 'axios';

const Planning: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for forcing re-render of the entire form
  const [formKey, setFormKey] = useState(Date.now());
  
  // State to track if this is a fresh plan (no saved initiatives should be shown)
  const [isNewPlan, setIsNewPlan] = useState(true);
  
  // State for planning form
  const [showPlanForm, setShowPlanForm] = useState(true); // Always show blank plan form by default
  const [selectedObjectives, setSelectedObjectives] = useState<StrategicObjective[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<StrategicObjective | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedSubProgram, setSelectedSubProgram] = useState<SubProgram | null>(null);
  const [selectedInitiative, setSelectedInitiative] = useState<StrategicInitiative | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<StrategicInitiative | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPerformanceMeasureForm, setShowPerformanceMeasureForm] = useState(false);
  const [editingPerformanceMeasure, setEditingPerformanceMeasure] = useState<PerformanceMeasure | null>(null);
  const [showMainActivityForm, setShowMainActivityForm] = useState(false);
  const [editingMainActivity, setEditingMainActivity] = useState<MainActivity | null>(null);
  const [activeTab, setActiveTab] = useState<'performance' | 'activities'>('performance');
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isLoadingCompleteData, setIsLoadingCompleteData] = useState(false);

  // Initialize planning period with default dates
  const getInitialDates = () => {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    return {
      fromDate: today.toISOString().split('T')[0],
      toDate: nextYear.toISOString().split('T')[0]
    };
  };
  
  const [planningPeriod, setPlanningPeriod] = useState<PlanningPeriod>(getInitialDates());

  // Helper function to reset all planning state
  const resetPlanningState = () => {
    // Reset all state variables
    setSelectedObjectives([]);
    setSelectedObjective(null);
    setSelectedProgram(null);
    setSelectedSubProgram(null);
    setSelectedInitiative(null);
    setEditingInitiative(null);
    setShowPerformanceMeasureForm(false);
    setEditingPerformanceMeasure(null);
    setShowMainActivityForm(false);
    setEditingMainActivity(null);
    setActiveTab('performance');
    setShowReviewModal(false);
    
    // Reset planning period dates
    setPlanningPeriod(getInitialDates());
    
    // Set isNewPlan to true to prevent showing previous initiatives
    setIsNewPlan(true);
    
    // Force re-render by changing the key
    setFormKey(Date.now());
    
    // IMPORTANT: Remove all queries from cache to ensure fresh data
    queryClient.removeQueries({ queryKey: ['initiatives'] });
    queryClient.removeQueries({ queryKey: ['performance-measures'] });
    queryClient.removeQueries({ queryKey: ['main-activities'] });
    queryClient.removeQueries({ queryKey: ['objectives'] });
    
    // Clear any validation or success messages
    setValidationMessage(null);
    setSuccessMessage(null);
  };

  // Fetch current user and their organization
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Force refresh of CSRF token first
        await axios.get('/api/auth/csrf/', { withCredentials: true });
        
        const authData = await auth.getCurrentUser();
        setAuthState(authData);
        
        if (authData.userOrganizations && authData.userOrganizations.length > 0) {
          const firstOrgId = authData.userOrganizations[0].organization;
          setOrganizationId(firstOrgId.toString());
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Fetch organization details
  const { data: organizationData } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => organizations.getAll(),
    enabled: !!organizationId,
  });

  // Fetch submitted plans - filter by current user's organization AND by planner
  const { data: submittedPlans, isLoading: loadingPlans, refetch: refetchPlans } = useQuery({
    queryKey: ['plans', 'submitted', organizationId, authState?.user?.id, formKey],
    queryFn: async () => {
      if (!organizationId || !authState?.user?.id) return { data: [] };
      try {
        console.log('Fetching all plans');
        
        // Ensure CSRF token is fresh
        await ensureCsrfToken();
        
        // Add timestamp to avoid caching
        const timestamp = new Date().getTime();
        const response = await plans.getAll();
        
        // Filter plans by the current user's organization AND by planner
        const filtered = response.data.filter((plan: any) => {
          // Only show plans:
          // 1. From the current user's organization
          const isOrgMatch = plan.organization.toString() === organizationId.toString();
          
          // 2. Created by the current user (checking planner_name against user's name)
          const isPlannerMatch = 
            (plan.planner_name === authState.user?.first_name) || 
            (plan.planner_name === authState.user?.username) ||
            // For admins, show all plans for their organization regardless of creator
            isAdmin(authState.userOrganizations);
          
          return isOrgMatch && isPlannerMatch;
        });
        
        console.log(`Filtered to ${filtered.length} plans for organization ${organizationId} and current user`);
        return { data: filtered };
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        throw error;
      }
    },
    enabled: !!organizationId && !!authState?.user?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to get latest statuses
    refetchOnWindowFocus: true, // Refresh when window gets focus
    staleTime: 0, // Don't cache this data
    cacheTime: 5000, // Short cache time
  });

  // Helper function to ensure CSRF token
  const ensureCsrfToken = async () => {
    try {
      const response = await axios.get('/api/auth/csrf/', { withCredentials: true });
      const token = response.headers['x-csrftoken'] || Cookies.get('csrftoken');
      
      if (token) {
        Cookies.set('csrftoken', token, { path: '/' });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      return false;
    }
  };

  // Find the planner's organization from the fetched data
  const plannerOrganization = organizationData?.data?.find(
    org => org.id.toString() === organizationId
  );

  // Function to load complete objective data with initiatives, measures and activities
  const loadCompleteObjectiveData = async (objective: StrategicObjective) => {
    try {
      console.log(`Loading complete data for objective ${objective.id}`);
      
      // Get initiatives for this objective
      const initiativesResponse = await initiatives.getByObjective(objective.id.toString());
      const objectiveInitiatives = initiativesResponse.data || [];
      
      console.log(`Found ${objectiveInitiatives.length} initiatives for objective ${objective.id}`);
      
      // For each initiative, get performance measures and main activities
      const initiativesWithDetails = await Promise.all(
        objectiveInitiatives.map(async (initiative: StrategicInitiative) => {
          try {
            console.log(`Loading details for initiative ${initiative.id}`);
            
            // Get performance measures
            const measuresResponse = await performanceMeasures.getByInitiative(initiative.id);
            const measures = measuresResponse.data || [];
            
            // Get main activities
            const activitiesResponse = await mainActivities.getByInitiative(initiative.id);
            const activities = activitiesResponse.data || [];
            
            console.log(`Initiative ${initiative.id} has ${measures.length} measures and ${activities.length} activities`);
            
            return {
              ...initiative,
              performance_measures: measures,
              main_activities: activities
            };
          } catch (error) {
            console.error(`Error loading details for initiative ${initiative.id}:`, error);
            return {
              ...initiative,
              performance_measures: [],
              main_activities: []
            };
          }
        })
      );
      
      // Return complete objective data
      return {
        ...objective,
        initiatives: initiativesWithDetails
      };
    } catch (error) {
      console.error(`Failed to load complete data for objective ${objective.id}:`, error);
      return { ...objective, initiatives: [] };
    }
  };

  // Function to prepare for review
  const handlePrepareForReview = async () => {
    if (selectedObjectives.length === 0) {
      setValidationMessage('Please select at least one objective');
      return;
    }

    try {
      setIsLoadingCompleteData(true);
      setValidationMessage(null);
      
      console.log(`Preparing ${selectedObjectives.length} objectives for review`);
      
      // Load complete data for all selected objectives
      const completeObjectives = await Promise.all(
        selectedObjectives.map(objective => loadCompleteObjectiveData(objective))
      );
      
      console.log('Completed loading all objective data for review', completeObjectives);
      
      // Update selected objectives with complete data
      setSelectedObjectives(completeObjectives);
      setShowReviewModal(true);
    } catch (error) {
      console.error('Failed to prepare data for review:', error);
      setValidationMessage('Failed to load complete data for review. Please try again.');
    } finally {
      setIsLoadingCompleteData(false);
    }
  };

  // Reset the form and start a new plan
  const handleNewPlan = () => {
    // Complete reset of all state
    resetPlanningState();
    
    // Clear any messages
    setValidationMessage(null);
    setSuccessMessage(null);
    
    // Make sure we're showing the planning form
    setShowPlanForm(true);
    
    // Show success message briefly
    setSuccessMessage('New plan started. Select a strategic objective, program, or subprogram to begin.');
    setTimeout(() => setSuccessMessage(null), 5000);
    
    // Clear all queries to ensure fresh data
    queryClient.removeQueries();
  };

  // Handle objective selection
  const handleObjectiveSelect = (objective: StrategicObjective) => {
    // If this is a new plan, we'll toggle the selection for review form
    const isSelected = selectedObjectives.some(obj => obj.id === objective.id);
    
    if (isSelected) {
      setSelectedObjectives(prev => prev.filter(obj => obj.id !== objective.id));
    } else {
      setSelectedObjectives(prev => [...prev, objective]);
    }
    
    setSelectedObjective(objective);
    setSelectedProgram(null);
    setSelectedSubProgram(null);
    setSelectedInitiative(null);
    setEditingInitiative(null);
    
    // Reset user-created data when changing objective
    setShowPerformanceMeasureForm(false);
    setEditingPerformanceMeasure(null);
    setShowMainActivityForm(false);
    setEditingMainActivity(null);
    setActiveTab('performance');
    
    // When selecting an objective in a new plan, clear initiative cache
    if (isNewPlan) {
      queryClient.removeQueries({ queryKey: ['initiatives'] });
      queryClient.removeQueries({ queryKey: ['initiatives', 'weight-summary'] });
    }
  };

  // Handle program selection
  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    setSelectedObjective(null);
    setSelectedSubProgram(null);
    setSelectedInitiative(null);
    setEditingInitiative(null);
    
    // Reset user-created data when changing program
    setShowPerformanceMeasureForm(false);
    setEditingPerformanceMeasure(null);
    setShowMainActivityForm(false);
    setEditingMainActivity(null);
    setActiveTab('performance');
    
    // When selecting a program in a new plan, clear initiative cache
    if (isNewPlan) {
      queryClient.removeQueries({ queryKey: ['initiatives'] });
      queryClient.removeQueries({ queryKey: ['initiatives', 'weight-summary'] });
    }
  };

  // Handle subprogram selection
  const handleSubProgramSelect = (subProgram: SubProgram) => {
    setSelectedSubProgram(subProgram);
    setSelectedObjective(null);
    setSelectedProgram(null);
    setSelectedInitiative(null);
    setEditingInitiative(null);
    
    // Reset user-created data when changing subprogram
    setShowPerformanceMeasureForm(false);
    setEditingPerformanceMeasure(null);
    setShowMainActivityForm(false);
    setEditingMainActivity(null);
    setActiveTab('performance');
    
    // When selecting a subprogram in a new plan, clear initiative cache
    if (isNewPlan) {
      queryClient.removeQueries({ queryKey: ['initiatives'] });
      queryClient.removeQueries({ queryKey: ['initiatives', 'weight-summary'] });
    }
  };

  // Handle initiative selection
  const handleInitiativeSelect = (initiative: StrategicInitiative) => {
    // Once an initiative is selected, it's no longer a completely new plan
    setIsNewPlan(false);
    
    setSelectedInitiative(initiative);
    setEditingInitiative(null);
    setShowPerformanceMeasureForm(false);
    setEditingPerformanceMeasure(null);
    setShowMainActivityForm(false);
    setEditingMainActivity(null);
    setActiveTab('performance');
  };

  // Handle plan submission
  const handleSubmitPlan = async () => {
    if (selectedObjectives.length === 0 || !organizationId || !authState?.user) {
      setValidationMessage('Please select at least one objective');
      return;
    }
    
    setIsSubmitting(true);
    setValidationMessage(null); // Clear any previous validation messages
    
    try {
      // Ensure CSRF token is fresh
      await ensureCsrfToken();
      
      console.log('Creating plans for selected objectives:', selectedObjectives);
      
      // Create plans for each selected objective
      const createdPlanIds = [];
      
      for (const objective of selectedObjectives) {
        try {
          // Create the plan with draft status
          const planData = {
            organization: organizationId,
            planner_name: authState.user.first_name || authState.user.username,
            type: 'LEAD_EXECUTIVE',
            strategic_objective: objective.id,
            fiscal_year: new Date().getFullYear().toString(),
            from_date: planningPeriod.fromDate,
            to_date: planningPeriod.toDate,
            status: 'DRAFT'
          };

          console.log('Creating plan with data:', planData);

          // Create plan
          const plan = await plans.create(planData);
          console.log('Created plan:', plan);
          createdPlanIds.push(plan.id);
          
          // Submit the plan for evaluation with a small delay to ensure plan is created fully
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            await plans.submitToEvaluator(plan.id);
            console.log('Submitted plan for evaluation');
          } catch (submitError) {
            console.error('Error submitting plan:', submitError);
          }
        } catch (error: any) {
          console.error('Error processing plan:', error);
          throw new Error(error.message || 'Failed to process plan');
        }
      }
      
      setSuccessMessage('Plans submitted successfully for evaluation');
      
      // Reset form state completely
      resetPlanningState();
      
      // Show the plans list instead of the form
      setShowPlanForm(false);
      
      // Refresh plans list with a small delay to ensure all operations complete
      setTimeout(async () => {
        await refetchPlans();
      }, 1000);
      
    } catch (error: any) {
      console.error('Plan submission error:', error);
      setValidationMessage(error.message || 'Failed to submit plans');
    } finally {
      setIsSubmitting(false);
      setShowReviewModal(false);
    }
  };

  // Handle view plan
  const handleViewPlan = async (plan: any) => {
    if (!plan || !plan.id) {
      setValidationMessage('Invalid plan data');
      return;
    }
    
    try {
      // Clear any previous messages
      setValidationMessage(null);
      console.log(`Navigating to plan with ID: ${plan.id}`);
      
      // Ensure CSRF token is fresh
      await ensureCsrfToken();
      
      // Fetch the plan data first to verify it's accessible and pre-cache it
      try {
        console.log("Prefetching plan data before navigation");
        const planData = await plans.getById(plan.id.toString());
        console.log("Plan prefetch successful:", planData);
        
        // Store the data in the query cache
        queryClient.setQueryData(['plan', plan.id.toString()], planData);
        
        // Navigate to the plan details page
        navigate(`/plans/${plan.id}`);
      } catch (error) {
        console.error("Error prefetching plan:", error);
        setValidationMessage("Failed to load plan details. Trying navigation anyway...");
        
        // Still try to navigate, even if prefetch failed
        setTimeout(() => {
          navigate(`/plans/${plan.id}`);
        }, 500);
      }
    } catch (error: any) {
      console.error('Error navigating to plan:', error);
      setValidationMessage('Error loading plan details. Please try again.');
    }
  };

  // Determine if user has planner role
  const userIsPlanner = authState ? isPlanner(authState.userOrganizations) : false;
  
  // Determine if user has admin role
  const userIsAdmin = authState ? isAdmin(authState.userOrganizations) : false;

  // Get the current parent name and weight
  const getCurrentParent = () => {
    if (selectedObjective) {
      return {
        id: selectedObjective.id.toString(),
        name: selectedObjective.title,
        weight: selectedObjective.weight,
        type: 'objective' as const,
        totalWeight: selectedObjective.total_initiatives_weight || 0
      };
    }
    if (selectedProgram) {
      return {
        id: selectedProgram.id.toString(),
        name: selectedProgram.name,
        weight: selectedProgram.weight,
        type: 'program' as const,
        totalWeight: selectedProgram.total_weight || 0
      };
    }
    if (selectedSubProgram) {
      return {
        id: selectedSubProgram.id.toString(),
        name: selectedSubProgram.name,
        weight: selectedSubProgram.weight,
        type: 'subprogram' as const,
        totalWeight: selectedSubProgram.total_weight || 0
      };
    }
    return null;
  };

  const currentParent = getCurrentParent();
  const isReadOnly = userIsAdmin && !userIsPlanner;

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategic Planning</h1>
          <p className="text-gray-600">Create and manage strategic objectives, initiatives, and performance measures</p>
        </div>
        
        {isReadOnly && (
          <div className="flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-md">
            <Info className="h-5 w-5 mr-2" />
            <span>View-only mode (Admin)</span>
          </div>
        )}
        
        {!userIsPlanner && !userIsAdmin && (
          <div className="flex items-center bg-red-50 text-red-700 px-4 py-2 rounded-md">
            <Lock className="h-5 w-5 mr-2" />
            <span>You don't have permission to access planning</span>
          </div>
        )}
        
        {userIsPlanner && (
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPlanForm(false)}
              className={`flex items-center px-4 py-2 text-sm font-medium border rounded-md ${
                !showPlanForm 
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Submitted Plans
            </button>
            <button
              onClick={handleNewPlan}
              className={`flex items-center px-4 py-2 text-sm font-medium border rounded-md ${
                showPlanForm 
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FilePlus className="h-4 w-4 mr-2" />
              Create New Plan
            </button>
          </div>
        )}
      </div>

      {validationMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>{validationMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Show either the plan form or the submitted plans table */}
      {showPlanForm ? (
        <div key={formKey}> {/* Use key to force re-render when creating a new plan */}
          {/* Planning Header */}
          {(userIsPlanner || userIsAdmin) && plannerOrganization && (
            <PlanningHeader
              organizationName={plannerOrganization.name}
              fromDate={planningPeriod.fromDate}
              toDate={planningPeriod.toDate}
              plannerName={authState?.user?.first_name || authState?.user?.username || ''}
              onFromDateChange={(date) => setPlanningPeriod(prev => ({ ...prev, fromDate: date }))}
              onToDateChange={(date) => setPlanningPeriod(prev => ({ ...prev, toDate: date }))}
            />
          )}

          {/* Selected Objectives Bar */}
          {selectedObjectives.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-10">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Selected Objectives:</span>
                  <div className="flex gap-2 mt-1">
                    {selectedObjectives.map(obj => (
                      <span
                        key={obj.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {obj.title}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handlePrepareForReview}
                  disabled={isLoadingCompleteData}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoadingCompleteData ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Loading Data...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Review and Submit Plans
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Review Modal */}
          {showReviewModal && selectedObjectives.length > 0 && plannerOrganization && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Plan Review</h2>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6">
                  <PlanReviewTable
                    objectives={selectedObjectives}
                    onSubmit={handleSubmitPlan}
                    isSubmitting={isSubmitting}
                    organizationName={plannerOrganization.name}
                    plannerName={authState?.user?.first_name || authState?.user?.username || ''}
                    fromDate={planningPeriod.fromDate}
                    toDate={planningPeriod.toDate}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Objectives List */}
            <div>
              <StrategicObjectivesList
                onSelectObjective={handleObjectiveSelect}
                selectedObjectiveId={selectedObjective?.id}
                onSelectProgram={handleProgramSelect}
                onSelectSubProgram={handleSubProgramSelect}
              />
            </div>

            {/* Middle Column - Initiative Management */}
            {currentParent && (
              <div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  {/* Parent Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{currentParent.name}</h2>
                      <p className="text-sm text-gray-500">{currentParent.type}</p>
                      <p className="text-sm font-medium text-blue-600">Weight: {currentParent.weight}%</p>
                    </div>
                    {userIsPlanner && !editingInitiative && (
                      <button
                        onClick={() => {
                          setEditingInitiative({});
                          setIsNewPlan(false);
                        }}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <PlusCircle className="h-5 w-5 mr-2" />
                        Create Initiative
                      </button>
                    )}
                  </div>

                  {/* Initiative Form or List */}
                  {editingInitiative ? (
                    <InitiativeForm
                      parentId={currentParent.id}
                      parentType={currentParent.type}
                      parentWeight={currentParent.weight}
                      currentTotal={currentParent.totalWeight}
                      onSubmit={async (data) => {
                        if (!userIsPlanner) {
                          setValidationMessage("You don't have permission to create or edit initiatives");
                          return Promise.reject(new Error("Permission denied"));
                        }
                        
                        try {
                          if (editingInitiative.id) {
                            await initiatives.update(editingInitiative.id, data);
                          } else {
                            await initiatives.create(data);
                          }
                          
                          // Use a unique key to help with cache invalidation
                          queryClient.removeQueries({ 
                            queryKey: ['initiatives', currentParent.id]
                          });
                          queryClient.removeQueries({
                            queryKey: ['initiatives', 'weight-summary', currentParent.id]
                          });
                          
                          setEditingInitiative(null);
                          setSuccessMessage(editingInitiative.id ? 'Initiative updated' : 'Initiative created');
                          setTimeout(() => setSuccessMessage(null), 3000);
                          return Promise.resolve();
                        } catch (error) {
                          console.error('Failed to save initiative:', error);
                          return Promise.reject(error);
                        }
                      }}
                      initialData={editingInitiative.id ? editingInitiative : undefined}
                    />
                  ) : (
                    <InitiativeList
                      key={`initiatives-${formKey}-${currentParent.id}-${isNewPlan ? 'new' : 'existing'}`}
                      parentId={currentParent.id}
                      parentType={currentParent.type}
                      onEditInitiative={(initiative) => {
                        if (userIsPlanner) {
                          setEditingInitiative(initiative);
                          setIsNewPlan(false);
                        } else {
                          setValidationMessage("You don't have permission to edit initiatives");
                          setTimeout(() => setValidationMessage(null), 5000);
                        }
                      }}
                      onSelectInitiative={handleInitiativeSelect}
                      isNewPlan={isNewPlan}
                      planKey={formKey.toString()}
                      showTodayOnly={isNewPlan} // Show today's initiatives only for new plans
                    />
                  )}
                </div>
              </div>
            )}

            {/* Right Column - Performance Measures and Main Activities */}
            {selectedInitiative && !editingInitiative && (
              <div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">{selectedInitiative.name}</h2>
                    <p className="text-sm font-medium text-blue-600">Weight: {selectedInitiative.weight}%</p>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('performance')}
                        className={`${
                          activeTab === 'performance'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Performance Measures
                      </button>
                      <button
                        onClick={() => setActiveTab('activities')}
                        className={`${
                          activeTab === 'activities'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Main Activities
                      </button>
                    </nav>
                  </div>

                  {/* Performance Measures */}
                  {activeTab === 'performance' && (
                    <div>
                      {showPerformanceMeasureForm ? (
                        <PerformanceMeasureForm
                          initiativeId={selectedInitiative.id}
                          currentTotal={selectedInitiative.total_measures_weight || 0}
                          onSubmit={async (data) => {
                            try {
                              if (editingPerformanceMeasure?.id) {
                                await performanceMeasures.update(editingPerformanceMeasure.id, data);
                              } else {
                                await performanceMeasures.create(data);
                              }
                              queryClient.invalidateQueries({
                                queryKey: ['performance-measures', selectedInitiative.id]
                              });
                              setShowPerformanceMeasureForm(false);
                              setEditingPerformanceMeasure(null);
                              return Promise.resolve();
                            } catch (error) {
                              console.error('Failed to save performance measure:', error);
                              return Promise.reject(error);
                            }
                          }}
                          initialData={editingPerformanceMeasure}
                          onCancel={() => {
                            setShowPerformanceMeasureForm(false);
                            setEditingPerformanceMeasure(null);
                          }}
                        />
                      ) : (
                        <div>
                          {userIsPlanner && (
                            <button
                              onClick={() => setShowPerformanceMeasureForm(true)}
                              className="mb-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <PlusCircle className="h-5 w-5 mr-2" />
                              Add Performance Measure
                            </button>
                          )}
                          <PerformanceMeasureList
                            initiativeId={selectedInitiative.id}
                            onEditMeasure={(measure) => {
                              if (userIsPlanner) {
                                setEditingPerformanceMeasure(measure);
                                setShowPerformanceMeasureForm(true);
                              }
                            }}
                            onDeleteMeasure={async (measureId) => {
                              if (userIsPlanner) {
                                try {
                                  await performanceMeasures.delete(measureId);
                                  queryClient.invalidateQueries({
                                    queryKey: ['performance-measures', selectedInitiative.id]
                                  });
                                } catch (error) {
                                  console.error('Failed to delete measure:', error);
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Activities */}
                  {activeTab === 'activities' && (
                    <div>
                      {showMainActivityForm ? (
                        <MainActivityForm
                          initiativeId={selectedInitiative.id}
                          currentTotal={selectedInitiative.total_activities_weight || 0}
                          onSubmit={async (data) => {
                            try {
                              if (editingMainActivity?.id) {
                                await mainActivities.update(editingMainActivity.id, data);
                              } else {
                                await mainActivities.create(data);
                              }
                              queryClient.invalidateQueries({
                                queryKey: ['main-activities', selectedInitiative.id]
                              });
                              setShowMainActivityForm(false);
                              setEditingMainActivity(null);
                              return Promise.resolve();
                            } catch (error) {
                              console.error('Failed to save main activity:', error);
                              return Promise.reject(error);
                            }
                          }}
                          initialData={editingMainActivity}
                          onCancel={() => {
                            setShowMainActivityForm(false);
                            setEditingMainActivity(null);
                          }}
                        />
                      ) : (
                        <div>
                          {userIsPlanner && (
                            <button
                              onClick={() => setShowMainActivityForm(true)}
                              className="mb-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <PlusCircle className="h-5 w-5 mr-2" />
                              Add Main Activity
                            </button>
                          )}
                          <MainActivityList
                            initiativeId={selectedInitiative.id}
                            onEditActivity={(activity) => {
                              if (userIsPlanner) {
                                setEditingMainActivity(activity);
                                setShowMainActivityForm(true);
                              }
                            }}
                            onDeleteActivity={async (activityId) => {
                              if (userIsPlanner) {
                                try {
                                  await mainActivities.delete(activityId);
                                  queryClient.invalidateQueries({
                                    queryKey: ['main-activities', selectedInitiative.id]
                                  });
                                } catch (error) {
                                  console.error('Failed to delete activity:', error);
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Submitted Plans View
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Submitted Plans</h3>
                <p className="mt-1 text-sm text-gray-500">
                  View all plans submitted for review and their current status.
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <button
                  onClick={handleNewPlan}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  Create New Plan
                </button>
              </div>
            </div>
            
            {loadingPlans ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-sm text-gray-500">Loading submitted plans...</p>
              </div>
            ) : !submittedPlans?.data || submittedPlans.data.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 mt-6">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900">No plans found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new plan.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleNewPlan}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <FilePlus className="h-4 w-4 mr-2" />
                    Create New Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Strategic Objective
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Feedback
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submittedPlans.data.map((plan: Plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {/* Display objective name if available, otherwise ID */}
                          {plan.strategic_objective ? (
                            <span>{
                              // Try to find the objective name
                              selectedObjectives.find(obj => obj.id.toString() === plan.strategic_objective.toString())?.title || 
                              `Objective ${plan.strategic_objective}`
                            }</span>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            {plan.organizationName || plannerOrganization?.name || 'Unknown Organization'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(plan.from_date)} - {formatDate(plan.to_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(plan.status)}`}>
                            {plan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {plan.updated_at ? formatDate(plan.updated_at) : 'Not available'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {plan.reviews && plan.reviews.length > 0 ? (
                            <div className="max-w-xs truncate">
                              {plan.reviews[0].feedback || 'No feedback provided'}
                            </div>
                          ) : (
                            <span className="text-gray-400">No review yet</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewPlan(plan)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          {plan.status === 'REJECTED' && (
                            <button
                              onClick={handleNewPlan}
                              className="text-green-600 hover:text-green-900"
                            >
                              Create New
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Planning;