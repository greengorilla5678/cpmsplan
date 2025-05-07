import axios from 'axios';
import Cookies from 'js-cookie';
import type { Plan, MainActivity, ActivityBudget } from '../types/plan';
import type { Organization, StrategicObjective, Program, SubProgram, StrategicInitiative, PerformanceMeasure } from '../types/organization';
import type { AuthState } from '../types/user';

// Create a base API instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to update CSRF token before each request
api.interceptors.request.use(config => {
  const token = Cookies.get('csrftoken');
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear cookies and redirect to login
      Cookies.remove('sessionid', { path: '/' });
      Cookies.remove('csrftoken', { path: '/' });
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Function to ensure CSRF token is set before making requests
const ensureCsrfToken = async () => {
  try {
    const response = await axios.get('/api/auth/csrf/', { withCredentials: true });
    const token = Cookies.get('csrftoken');
    
    if (!token && response.headers['x-csrftoken']) {
      Cookies.set('csrftoken', response.headers['x-csrftoken'], { path: '/' });
      return true;
    }
    
    return !!token;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return false;
  }
};

// Authentication service
export const auth = {
  login: async (username: string, password: string) => {
    try {
      await ensureCsrfToken();
      const response = await api.post('/auth/login/', { username, password });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  },
  
  logout: async () => {
    try {
      await ensureCsrfToken();
      await api.post('/auth/logout/');
      Cookies.remove('sessionid', { path: '/' });
      Cookies.remove('csrftoken', { path: '/' });
      window.location.href = '/login';
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await api.get('/auth/check/');
      return { isAuthenticated: !!response.data.isAuthenticated };
    } catch (error) {
      console.error('Auth check error:', error);
      return { isAuthenticated: false };
    }
  },
  
  getCurrentUser: async (): Promise<AuthState> => {
    try {
      const response = await api.get('/auth/check/');
      return {
        isAuthenticated: true,
        user: response.data.user,
        userOrganizations: response.data.userOrganizations || []
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return { isAuthenticated: false, user: null, userOrganizations: [] };
    }
  },
  
  isAuthenticated: () => {
    return !!Cookies.get('sessionid');
  }
};

// Strategic initiatives service
export const initiatives = {
  getAll: () => api.get<{ data: StrategicInitiative[] }>('/strategic-initiatives/'),
  getById: (id: string) => api.get<StrategicInitiative>(`/strategic-initiatives/${id}/`),
  getByObjective: (objectiveId: string, createdDate?: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    let url = `/strategic-initiatives/?objective=${objectiveId}&_=${timestamp}`;
    
    // Add created_date filter if provided
    if (createdDate) {
      url += `&created_date=${createdDate}`;
    }
    
    return api.get<{ data: StrategicInitiative[] }>(url, 
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  getByProgram: (programId: string, createdDate?: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    let url = `/strategic-initiatives/?program=${programId}&_=${timestamp}`;
    
    // Add created_date filter if provided
    if (createdDate) {
      url += `&created_date=${createdDate}`;
    }
    
    return api.get<{ data: StrategicInitiative[] }>(url,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  getBySubProgram: (subProgramId: string, createdDate?: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    let url = `/strategic-initiatives/?subprogram=${subProgramId}&_=${timestamp}`;
    
    // Add created_date filter if provided
    if (createdDate) {
      url += `&created_date=${createdDate}`;
    }
    
    return api.get<{ data: StrategicInitiative[] }>(url,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  create: (data: Partial<StrategicInitiative>) => 
    api.post<StrategicInitiative>('/strategic-initiatives/', data),
  update: (id: string, data: Partial<StrategicInitiative>) => 
    api.patch<StrategicInitiative>(`/strategic-initiatives/${id}/`, data),
  delete: (id: string) => api.delete(`/strategic-initiatives/${id}/`),
  getWeightSummary: (parentId: string, parentType: 'objective' | 'program' | 'subprogram') => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get(
      `/strategic-initiatives/weight_summary/?parent=${parentId}&parent_type=${parentType}&_=${timestamp}`,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  validateInitiativesWeight: (parentId: string, parentType: 'objective' | 'program' | 'subprogram') => 
    api.post(`/strategic-initiatives/validate_initiatives_weight/?parent=${parentId}&parent_type=${parentType}`),
};

// Performance measures service
export const performanceMeasures = {
  getAll: () => api.get<{ data: PerformanceMeasure[] }>('/performance-measures/'),
  getById: (id: string) => api.get<PerformanceMeasure>(`/performance-measures/${id}/`),
  getByInitiative: (initiativeId: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get<{ data: PerformanceMeasure[] }>(
      `/performance-measures/?initiative=${initiativeId}&_=${timestamp}`,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  create: (data: Partial<PerformanceMeasure>) => 
    api.post<PerformanceMeasure>('/performance-measures/', data),
  update: (id: string, data: Partial<PerformanceMeasure>) => 
    api.patch<PerformanceMeasure>(`/performance-measures/${id}/`, data),
  delete: (id: string) => api.delete(`/performance-measures/${id}/`),
  getWeightSummary: (initiativeId: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get(
      `/performance-measures/weight_summary/?initiative=${initiativeId}&_=${timestamp}`,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  validateMeasuresWeight: (initiativeId: string) => 
    api.post(`/performance-measures/validate_measures_weight/?initiative=${initiativeId}`),
};

// Strategic objectives service
export const objectives = {
  getAll: () => api.get<{ data: StrategicObjective[] }>('/strategic-objectives/'),
  getById: (id: string) => api.get<StrategicObjective>(`/strategic-objectives/${id}/`),
  create: (data: Partial<StrategicObjective>) => 
    api.post<StrategicObjective>('/strategic-objectives/', data),
  update: (id: string, data: Partial<StrategicObjective>) => 
    api.patch<StrategicObjective>(`/strategic-objectives/${id}/`, data),
  delete: (id: string) => api.delete(`/strategic-objectives/${id}/`),
  getWeightSummary: () => api.get('/strategic-objectives/weight_summary/'),
  validateTotalWeight: () => api.post('/strategic-objectives/validate_total_weight/'),
};

// Organizations service
export const organizations = {
  getAll: () => api.get<{ data: Organization[] }>('/organizations/'),
  getById: (id: string) => api.get<Organization>(`/organizations/${id}/`),
  getHierarchy: () => api.get<{ data: Organization[] }>('/organizations/hierarchy/'),
  getUserOrganizations: () => api.get<{ data: Organization[] }>('/organizations/user_organizations/'),
  getPrograms: (objectiveId: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get<{ data: Program[] }>(
      `/programs/?strategic_objective=${objectiveId}&_=${timestamp}`,
      { 
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  },
  getSubPrograms: (programId: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get<{ data: SubProgram[] }>(
      `/subprograms/?program=${programId}&_=${timestamp}`,
      { 
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache', 
          'Expires': '0'
        } 
      }
    );
  },
};

// Plans service
export const plans = {
  getAll: async () => {
    try {
      console.log('Fetching all plans');
      // Add cache busting to prevent caching issues
      const timestamp = new Date().getTime();
      
      // Ensure CSRF token is fresh
      await ensureCsrfToken();
      
      const response = await api.get<{ data: Plan[] }>(`/plans/?_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-CSRFToken': Cookies.get('csrftoken')
        }
      });
      console.log('All plans fetched successfully:', response.data);
      return response;
    } catch (error: any) {
      console.error('Error fetching plans:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch plans');
    }
  },
  
  getById: async (id: string) => {
    try {
      if (!id) {
        throw new Error('Plan ID is required');
      }
      console.log(`Fetching plan with ID: ${id}`);
      
      // Ensure CSRF token is fresh
      await ensureCsrfToken();
      
      // Add cache busting parameter to avoid caching issues
      const timestamp = new Date().getTime();
      
      // Try multiple approaches to fetch the plan data
      let response;
      try {
        // First attempt: Direct axios call
        console.log("Attempt 1: Direct axios call");
        const headers = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-CSRFToken': Cookies.get('csrftoken') || '',
          'Accept': 'application/json'
        };
        
        response = await axios.get(`/api/plans/${id}/?_=${timestamp}`, { 
          headers,
          withCredentials: true,
          timeout: 15000 // 15 second timeout
        });
      } catch (error) {
        console.error('First attempt failed:', error);
        
        // Second attempt: Using the api instance
        console.log("Attempt 2: Using api instance");
        response = await api.get(`/plans/${id}/?_=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Accept': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        });
      }
      
      if (!response || !response.data) {
        throw new Error("No data received from server");
      }
      
      console.log("Plan data retrieved:", response.data);
      
      // Process the plan data to ensure correct structure
      const processedPlan = normalizeAndProcessPlanData(response.data);
      return processedPlan;
    } catch (error: any) {
      console.error("Error fetching plan:", error);
      throw error;
    }
  },
  
  getPendingReviews: async () => {
    try {
      console.log('Fetching pending plans for review...');
      // Add cache busting parameter
      const timestamp = new Date().getTime();
      
      // Ensure CSRF token is fresh
      await ensureCsrfToken();
      
      const response = await api.get(`/plans/?status=SUBMITTED&_=${timestamp}`, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-CSRFToken': Cookies.get('csrftoken')
        }
      });
      
      console.log('Pending plans response:', response);
      
      if (!response.data) {
        console.log('No pending plans data received');
        return { data: [] };
      }
      
      // Ensure we have an array of plans
      const plansData = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${plansData.length} pending plans`);
      
      return { data: plansData };
    } catch (error: any) {
      console.error('Error fetching pending reviews:', error.response?.data || error);
      throw error;
    }
  },
  
  create: async (data: Partial<Plan>) => {
    try {
      await ensureCsrfToken();
      console.log('Creating new plan with data:', data);
      const response = await api.post<Plan>('/plans/', data);
      console.log('Plan created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Plan creation error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to create plan');
    }
  },
  
  update: async (id: string, data: Partial<Plan>) => {
    try {
      await ensureCsrfToken();
      console.log(`Updating plan ${id} with data:`, data);
      const response = await api.patch<Plan>(`/plans/${id}/`, data);
      console.log('Plan updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Plan update error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to update plan');
    }
  },
  
  delete: async (id: string) => {
    try {
      await ensureCsrfToken();
      console.log(`Deleting plan ${id}`);
      const response = await api.delete(`/plans/${id}/`);
      console.log('Plan deleted successfully');
      return response;
    } catch (error: any) {
      console.error('Plan deletion error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to delete plan');
    }
  },
  
  finalize: async (id: string) => {
    try {
      await ensureCsrfToken();
      console.log(`Finalizing plan ${id}`);
      const response = await api.post<Plan>(`/plans/${id}/finalize/`);
      console.log('Plan finalized successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Plan finalization error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to finalize plan');
    }
  },
  
  submitToEvaluator: async (id: string) => {
    try {
      await ensureCsrfToken();
      console.log(`Submitting plan ${id} to evaluator...`);
      const timestamp = new Date().getTime(); // Cache busting
      
      // Explicit API call with headers
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': Cookies.get('csrftoken') || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const response = await axios.post(`/api/plans/${id}/submit/?_=${timestamp}`, {}, {
        headers,
        withCredentials: true
      });
      
      console.log('Plan submitted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Plan submission error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to submit plan');
    }
  },
  
  approve: async (id: string, feedback: string = '') => {
    try {
      await ensureCsrfToken();
      console.log(`Approving plan ${id}...`);
      const timestamp = new Date().getTime(); // Cache busting
      
      // Direct API call with explicit headers
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': Cookies.get('csrftoken') || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const response = await axios.post(`/api/plans/${id}/approve/?_=${timestamp}`, 
        { feedback },
        { headers, withCredentials: true }
      );
      
      console.log('Plan approved successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Plan approval error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to approve plan');
    }
  },
  
  reject: async (id: string, feedback: string) => {
    try {
      await ensureCsrfToken();
      console.log(`Rejecting plan ${id} with feedback: ${feedback}`);
      const timestamp = new Date().getTime(); // Cache busting
      
      // Direct API call with explicit headers
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': Cookies.get('csrftoken') || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      const response = await axios.post(`/api/plans/${id}/reject/?_=${timestamp}`, 
        { feedback },
        { headers, withCredentials: true }
      );
      
      console.log('Plan rejected successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Plan rejection error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to reject plan');
    }
  }
};

// Helper function to normalize and process plan data
const normalizeAndProcessPlanData = (plan: any) => {
  if (!plan) return plan;
  
  // Create a deep clone to avoid modifying the original
  const processedPlan = JSON.parse(JSON.stringify(plan));
  
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

// Main activities service
export const mainActivities = {
  getAll: () => api.get<{ data: MainActivity[] }>('/main-activities/'),
  getById: (id: string) => api.get<MainActivity>(`/main-activities/${id}/`),
  getByInitiative: (initiativeId: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get<{ data: MainActivity[] }>(
      `/main-activities/?initiative=${initiativeId}&_=${timestamp}`,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  create: (data: Partial<MainActivity>) => 
    api.post<MainActivity>('/main-activities/', data),
  update: (id: string, data: Partial<MainActivity>) => 
    api.patch<MainActivity>(`/main-activities/${id}/`, data),
  delete: (id: string) => api.delete(`/main-activities/${id}/`),
  getWeightSummary: (initiativeId: string) => {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return api.get(
      `/main-activities/weight_summary/?initiative=${initiativeId}&_=${timestamp}`,
      { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    );
  },
  validateActivitiesWeight: (initiativeId: string) => 
    api.post(`/main-activities/validate_activities_weight/?initiative=${initiativeId}`),
  updateBudget: async (id: string, data: Partial<ActivityBudget>) => {
    try {
      await ensureCsrfToken();

      // Ensure all numeric values are properly formatted
      const formattedData = {
        ...data,
        activity_id: id,
        estimated_cost_with_tool: Number(data.estimated_cost_with_tool || 0),
        estimated_cost_without_tool: Number(data.estimated_cost_without_tool || 0),
        government_treasury: Number(data.government_treasury || 0),
        sdg_funding: Number(data.sdg_funding || 0),
        partners_funding: Number(data.partners_funding || 0),
        other_funding: Number(data.other_funding || 0),
      };

      console.log("Sending budget update with formatted data:", formattedData);

      // Use POST instead of PATCH for the budget update endpoint
      const response = await api.post(`/main-activities/${id}/budget/`, formattedData);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }

      return response;
    } catch (error: any) {
      console.error('Budget update error:', error.response?.data || error);
      throw new Error(error.response?.data?.detail || 'Failed to update budget');
    }
  },
};

// Activity budgets service
export const activityBudgets = {
  getAll: () => api.get<{ data: ActivityBudget[] }>('/activity-budgets/'),
  getById: (id: string) => api.get<ActivityBudget>(`/activity-budgets/${id}/`),
  create: async (data: Partial<ActivityBudget>) => {
    try {
      await ensureCsrfToken();
      const response = await api.post<ActivityBudget>('/activity-budgets/', data);
      return response;
    } catch (error: any) {
      console.error('Failed to create budget:', error);
      throw new Error(error.response?.data?.detail || 'Failed to create budget');
    }
  },
  update: async (id: string, data: Partial<ActivityBudget>) => {
    try {
      await ensureCsrfToken();
      const response = await api.patch<ActivityBudget>(`/activity-budgets/${id}/`, data);
      return response;
    } catch (error: any) {
      console.error('Failed to update budget:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update budget');
    }
  },
  delete: (id: string) => api.delete(`/activity-budgets/${id}/`),
  getByActivity: (activityId: string) => 
    api.get<ActivityBudget>(`/activity-budgets/?activity=${activityId}`),
};

export {
  api,
  
};