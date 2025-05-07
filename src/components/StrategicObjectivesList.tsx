import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { objectives, organizations } from '../lib/api';
import { Target, AlertCircle, CheckCircle, ChevronRight, BookOpen, ListTree, ChevronDown, Building2, Layers, Info } from 'lucide-react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import type { StrategicObjective, Program, SubProgram } from '../types/organization';

interface StrategicObjectivesListProps {
  onSelectObjective: (objective: StrategicObjective) => void;
  selectedObjectiveId?: string | number | null;
  onSelectProgram?: (program: Program) => void;
  onSelectSubProgram?: (subProgram: SubProgram) => void;
}

const StrategicObjectivesList: React.FC<StrategicObjectivesListProps> = ({
  onSelectObjective,
  selectedObjectiveId,
  onSelectProgram,
  onSelectSubProgram
}) => {
  const { t } = useLanguage();
  const [expandedObjectives, setExpandedObjectives] = useState<Record<string | number, boolean>>({});
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string | number, boolean>>({});
  
  // Fetch objectives with their related programs and subprograms
  const { data: objectivesData, isLoading } = useQuery({
    queryKey: ['objectives', 'all', 'hierarchy'],
    queryFn: async () => {
      try {
        console.log("FETCH: Starting to fetch objectives hierarchy");
        
        // Step 1: Fetch all objectives
        const objectivesResponse = await objectives.getAll();
        const allObjectives = objectivesResponse.data || [];
        console.log(`FETCH: Found ${allObjectives.length} objectives`);
        
        // Step 2: Process each objective to get its programs and those programs' subprograms
        const processedObjectives = await Promise.all(
          allObjectives.map(async (objective: StrategicObjective) => {
            console.log(`FETCH: Processing objective ${objective.id}: ${objective.title}`);
            
            try {
              // Fetch programs for this specific objective
              const programsResponse = await organizations.getPrograms(objective.id.toString());
              const objectivePrograms = programsResponse.data || [];
              console.log(`FETCH: Found ${objectivePrograms.length} programs for objective ${objective.id}`);
              
              // Step 3: For each program, fetch its subprograms
              const programsWithChildren = await Promise.all(
                objectivePrograms.map(async (program: Program) => {
                  console.log(`FETCH: Processing program ${program.id}: ${program.name}`);
                  
                  try {
                    // Fetch subprograms for this specific program
                    const subprogramsResponse = await organizations.getSubPrograms(program.id.toString());
                    const programSubprograms = subprogramsResponse.data || [];
                    
                    console.log(`FETCH: Found ${programSubprograms.length} subprograms for program ${program.id}`);
                    
                    // Return program with its own subprograms only
                    return {
                      ...program,
                      // Ensure subprograms is an array, even if empty
                      subprograms: programSubprograms
                    };
                  } catch (error) {
                    console.error(`FETCH ERROR: Failed to load subprograms for program ${program.id}:`, error);
                    return { ...program, subprograms: [] };
                  }
                })
              );
              
              // Return objective with its programs and their respective subprograms
              return {
                ...objective,
                programs: programsWithChildren
              };
            } catch (error) {
              console.error(`FETCH ERROR: Failed to load programs for objective ${objective.id}:`, error);
              return { ...objective, programs: [] };
            }
          })
        );
        
        console.log("FETCH: Completed loading objectives hierarchy with programs and subprograms");
        return { data: processedObjectives };
      } catch (error) {
        console.error("FETCH ERROR: Failed to load objectives hierarchy:", error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    cacheTime: 0, // Don't cache this data to ensure fresh loads
  });

  // Initialize expanded state for objectives when data is loaded
  useEffect(() => {
    if (objectivesData?.data) {
      const newExpandedState: Record<string | number, boolean> = {};
      objectivesData.data.forEach((objective: StrategicObjective) => {
        // Default to expanded for the first objective or the selected objective
        newExpandedState[objective.id] = objective.id === selectedObjectiveId ||
          Object.keys(expandedObjectives).length < 1;
      });
      setExpandedObjectives(prev => ({...prev, ...newExpandedState}));
    }
  }, [objectivesData?.data, selectedObjectiveId]);

  const { data: weightSummary } = useQuery({
    queryKey: ['objectives', 'weight-summary'],
    queryFn: () => objectives.getWeightSummary(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (!objectivesData?.data || objectivesData.data.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Strategic Objectives</h3>
        <p className="text-gray-500">No strategic objectives have been defined yet.</p>
      </div>
    );
  }

  const totalWeight = weightSummary?.data?.total_weight || 0;
  const remainingWeight = weightSummary?.data?.remaining_weight || 0;

  const toggleObjectiveExpanded = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedObjectives(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleProgramExpanded = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPrograms(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleObjectiveClick = (objective: StrategicObjective) => {
    onSelectObjective(objective);
  };

  const handleProgramClick = (e: React.MouseEvent, program: Program) => {
    e.stopPropagation(); // Prevent objective selection
    if (onSelectProgram) {
      onSelectProgram(program);
    }
  };

  const handleSubProgramClick = (e: React.MouseEvent, subProgram: SubProgram) => {
    e.stopPropagation(); // Prevent objective and program selection
    if (onSelectSubProgram) {
      onSelectSubProgram(subProgram);
    }
  };

  return (
    <div className="space-y-6">
      {/* Weight Summary */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Total Weight</div>
            <div className="text-2xl font-bold text-gray-900">{totalWeight}%</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Remaining</div>
            <div className={`text-2xl font-bold ${remainingWeight === 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {remainingWeight}%
            </div>
          </div>
        </div>

        {remainingWeight > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700">
              Total weight must equal 100%. Currently at {totalWeight}%
            </p>
          </div>
        )}

        {remainingWeight === 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700">
              Weight distribution is balanced at 100%
            </p>
          </div>
        )}
      </div>

      {/* Objectives List */}
      <div className="grid gap-4">
        {objectivesData.data.map((objective) => (
          <div
            key={objective.id}
            className={`w-full bg-white rounded-lg shadow-sm border transition-colors
              ${objective.id === selectedObjectiveId 
                ? 'border-green-500 ring-1 ring-green-500' 
                : 'border-gray-200 hover:border-green-300'}`}
          >
            <button
              onClick={() => handleObjectiveClick(objective)}
              className="w-full text-left p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-medium text-gray-900">{objective.title}</h3>
                  </div>
                  <p className="mt-1 text-gray-500 pl-7">{objective.description}</p>
                </div>
                <div className="ml-4 flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {objective.weight}%
                  </span>
                </div>
              </div>
            </button>

            <div className="border-t border-gray-200 pt-4 px-6 pb-6">
              {/* Programs Section Header */}
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Programs
                </h4>
                <button
                  onClick={(e) => toggleObjectiveExpanded(objective.id, e)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  {expandedObjectives[objective.id] ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {expandedObjectives[objective.id] && (
                <>
                  {objective.programs && objective.programs.length > 0 ? (
                    <div className="space-y-4 mt-2">
                      {objective.programs.map((program) => (
                        <div key={program.id} className="rounded-lg border border-gray-200">
                          {/* Program Header */}
                          <div 
                            className="bg-gray-50 p-4 hover:bg-gray-100 transition-colors cursor-pointer rounded-t-lg"
                            onClick={(e) => handleProgramClick(e, program)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <h4 className="font-medium text-gray-900">{program.name}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-blue-600 font-medium">{program.weight}%</span>
                                {program.subprograms && program.subprograms.length > 0 && (
                                  <button
                                    onClick={(e) => toggleProgramExpanded(program.id, e)}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                  >
                                    {expandedPrograms[program.id] ? (
                                      <ChevronDown className="h-5 w-5" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 ml-6">{program.description}</p>
                          </div>
                          
                          {/* Subprograms Section */}
                          {expandedPrograms[program.id] && (
                            <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
                              {program.subprograms && program.subprograms.length > 0 ? (
                                <>
                                  <div className="mb-2 pl-6 flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-indigo-500" />
                                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subprograms</h5>
                                  </div>
                                  <div className="space-y-2 pl-6">
                                    {program.subprograms.map((subprogram) => (
                                      <div 
                                        key={subprogram.id} 
                                        className="flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors cursor-pointer border border-gray-100"
                                        onClick={(e) => handleSubProgramClick(e, subprogram)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <ListTree className="h-4 w-4 text-indigo-600" />
                                          <span className="text-sm text-gray-800">{subprogram.name}</span>
                                        </div>
                                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                          {subprogram.weight}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-gray-500 italic pl-6 p-2 bg-gray-50 rounded-md">
                                  <Info className="h-4 w-4 text-gray-400" />
                                  <p>No subprograms for this program</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500 italic pl-4 mt-2 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p>No programs defined for this objective</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategicObjectivesList;