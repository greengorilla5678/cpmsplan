import React from 'react';
import { Download, FileSpreadsheet, File as FilePdf, Send, Loader, Building2, Calendar, User, DollarSign, Users, Target, Activity } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/utils/export';
import type { StrategicObjective, StrategicInitiative } from '../types/organization';
import { MONTHS } from '../types/plan';

interface PlanReviewTableProps {
  objectives: StrategicObjective[];
  onSubmit: () => void;
  isSubmitting: boolean;
  organizationName: string;
  plannerName: string;
  fromDate: string;
  toDate: string;
}

const PlanReviewTable: React.FC<PlanReviewTableProps> = ({ 
  objectives, 
  onSubmit,
  isSubmitting,
  organizationName,
  plannerName,
  fromDate,
  toDate
}) => {
  const handleExportExcel = () => {
    const data = formatDataForExport(objectives);
    exportToExcel(data, `plan-${new Date().toISOString()}`);
  };

  const handleExportPDF = () => {
    const data = formatDataForExport(objectives);
    exportToPDF(data, `plan-${new Date().toISOString()}`);
  };

  const formatDataForExport = (objectives: StrategicObjective[]) => {
    const data: any[] = [];

    objectives.forEach((objective, objIndex) => {
      const initiatives = objective.initiatives || [];
      
      initiatives.forEach((initiative) => {
        const measures = initiative.performance_measures || [];
        const activities = initiative.main_activities || [];
        const maxItems = Math.max(measures.length, activities.length);

        Array.from({ length: maxItems }).forEach((_, itemIndex) => {
          const measure = measures[itemIndex];
          const activity = activities[itemIndex];

          data.push({
            'No': itemIndex === 0 ? (objIndex + 1).toString() : '',
            'Strategic Objective': itemIndex === 0 ? objective.title : '',
            'Initiative': itemIndex === 0 ? initiative.name : '',
            'Performance Measure/Main Activity': measure ? measure.name : activity ? activity.name : '',
            'Type': measure ? 'Performance Measure' : activity ? 'Main Activity' : '',
            'Weight': measure ? `${measure.weight}%` : activity ? `${activity.weight}%` : '',
            'Baseline': measure ? measure.baseline : 'N/A',
            'Target': measure ? {
              annual: measure.annual_target,
              q1: measure.q1_target,
              q2: measure.q2_target,
              q3: measure.q3_target,
              q4: measure.q4_target
            } : 'N/A',
            'Period': activity ? (
              activity.selected_quarters.length > 0 
                ? activity.selected_quarters
                : activity.selected_months
            ) : 'N/A',
            'Implementor Team/Desk': activity ? 'ICT Executive Office' : 'N/A',
            'Budget': activity?.budget ? {
              total: activity.budget.estimated_cost_with_tool,
              treasury: activity.budget.government_treasury,
              sdg: activity.budget.sdg_funding,
              partners: activity.budget.partners_funding,
              other: activity.budget.other_funding
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

    objectives.forEach(objective => {
      objective.initiatives?.forEach(initiative => {
        initiative.main_activities?.forEach(activity => {
          if (activity.budget) {
            total += activity.budget.estimated_cost_with_tool;
            governmentTotal += activity.budget.government_treasury;
            sdgTotal += activity.budget.sdg_funding;
            partnersTotal += activity.budget.partners_funding;
            otherTotal += activity.budget.other_funding;
          }
        });
      });
    });

    return {
      total,
      governmentTotal,
      sdgTotal,
      partnersTotal,
      otherTotal
    };
  };

  const budgetTotals = calculateTotalBudget();

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <Building2 className="h-5 w-5" />
              <h3 className="text-sm font-medium">Organization Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500">Organization Name</label>
                <p className="text-sm font-medium text-gray-900">{organizationName}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Planner Name</label>
                <p className="text-sm font-medium text-gray-900">{plannerName}</p>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <Calendar className="h-5 w-5" />
              <h3 className="text-sm font-medium">Planning Period</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500">From Date</label>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(fromDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500">To Date</label>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(toDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Plan Summary</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review your plan details before submission
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FilePdf className="h-4 w-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Objectives</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {objectives.length}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Activities</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {objectives.reduce((total, obj) => 
              total + obj.initiatives?.reduce((sum, init) => 
                sum + (init.main_activities?.length || 0), 0
              ) || 0, 0
            )}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Measures</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {objectives.reduce((total, obj) => 
              total + obj.initiatives?.reduce((sum, init) => 
                sum + (init.performance_measures?.length || 0), 0
              ) || 0, 0
            )}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Budget</h3>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            ${budgetTotals.total.toLocaleString()}
          </p>
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Government:</span>
              <span className="font-medium">${budgetTotals.governmentTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>SDG:</span>
              <span className="font-medium">${budgetTotals.sdgTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Partners:</span>
              <span className="font-medium">${budgetTotals.partnersTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Other:</span>
              <span className="font-medium">${budgetTotals.otherTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-gray-600">Performance Measure</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-600" />
          <span className="text-sm text-gray-600">Main Activity</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-collapse [&_th]:border [&_td]:border table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  No
                </th>
                <th className="w-48 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Strategic Objective
                </th>
                <th className="w-48 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Initiative
                </th>
                <th className="w-48 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Performance Measure/Main Activity
                </th>
                <th className="w-20 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Weight
                </th>
                <th className="w-32 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Baseline
                </th>
                <th className="w-32 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Target
                </th>
                <th className="w-32 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Period
                </th>
                <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Implementor Team/Desk
                </th>
                <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                  Budget
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {objectives.map((objective, objIndex) => {
                const initiatives = objective.initiatives || [];
                let rowCount = 0;
                
                // Calculate max items for rowspan
                initiatives.forEach(initiative => {
                  const measureCount = initiative.performance_measures?.length || 0;
                  const activityCount = initiative.main_activities?.length || 0;
                  rowCount += Math.max(measureCount, activityCount);
                });

                return initiatives.map((initiative, initIndex) => {
                  const measures = initiative.performance_measures || [];
                  const activities = initiative.main_activities || [];
                  const maxItems = Math.max(measures.length, activities.length);

                  return Array.from({ length: maxItems }).map((_, itemIndex) => {
                    const measure = measures[itemIndex];
                    const activity = activities[itemIndex];

                    return (
                      <tr key={`${initiative.id}-${itemIndex}`} className={
                        measure ? 'bg-blue-50' : activity ? 'bg-green-50' : ''
                      }>
                        {itemIndex === 0 && initIndex === 0 && (
                          <td className="px-2 py-2 text-sm font-medium text-gray-900 border" rowSpan={rowCount}>
                            {objIndex + 1}
                          </td>
                        )}
                        {itemIndex === 0 && initIndex === 0 && (
                          <td className="px-2 py-2 text-base font-bold text-gray-900 border" rowSpan={rowCount}>
                            {objective.title}
                          </td>
                        )}
                        {itemIndex === 0 && (
                          <td className="px-2 py-2 text-sm text-gray-900 border" rowSpan={maxItems}>
                            {initiative.name}
                          </td>
                        )}
                        <td className="px-2 py-2 text-sm text-gray-900 border">
                          <div className="flex items-center gap-2">
                            {measure ? (
                              <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            ) : activity ? (
                              <Activity className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : null}
                            <span>{measure ? measure.name : activity ? activity.name : ''}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 border">
                          {measure ? `${measure.weight}%` : activity ? `${activity.weight}%` : ''}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 border">
                          {measure ? measure.baseline : 'N/A'}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 border">
                          {measure ? (
                            <div className="text-xs space-y-1">
                              <div className="font-medium">Annual: {measure.annual_target}</div>
                              <div className="text-gray-500">Q1: {measure.q1_target}</div>
                              <div className="text-gray-500">Q2: {measure.q2_target}</div>
                              <div className="text-gray-500">Q3: {measure.q3_target}</div>
                              <div className="text-gray-500">Q4: {measure.q4_target}</div>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500 border">
                          {activity ? (
                            <div>
                              {activity.selected_quarters.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => (
                                    <div
                                      key={quarter}
                                      className={`px-1 py-0.5 rounded text-center ${
                                        activity.selected_quarters.includes(quarter)
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-50 text-gray-400'
                                      }`}
                                    >
                                      {quarter}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-1">
                                  {MONTHS.map(month => (
                                    <div
                                      key={month.value}
                                      className={`px-1 py-0.5 rounded text-center ${
                                        activity.selected_months.includes(month.value)
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-50 text-gray-400'
                                      }`}
                                    >
                                      {month.value}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 border">
                          {activity ? (
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-gray-400 mr-2" />
                              <span>ICT Executive Office</span>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 border">
                          {activity?.budget ? (
                            <div>
                              <div className="font-medium">
                                ${activity.budget.estimated_cost_with_tool.toLocaleString()}
                              </div>
                              <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                <div>Treasury: ${activity.budget.government_treasury.toLocaleString()}</div>
                                <div>SDG: ${activity.budget.sdg_funding.toLocaleString()}</div>
                                <div>Partners: ${activity.budget.partners_funding.toLocaleString()}</div>
                                <div>Other: ${activity.budget.other_funding.toLocaleString()}</div>
                              </div>
                            </div>
                          ) : 'N/A'}
                        </td>
                      </tr>
                    );
                  });
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlanReviewTable;