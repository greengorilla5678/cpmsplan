import React from 'react';
import { Activity, UserCircle, Building2, Users, Briefcase } from 'lucide-react';
import type { Organization } from '../types/organization';

interface OrganizationChartProps {
  data: Organization[];
}

const getIcon = (type: Organization['type']) => {
  switch (type) {
    case 'MINISTER':
      return <Activity className="w-5 h-5 text-white" />;
    case 'STATE_MINISTER':
      return <UserCircle className="w-5 h-5 text-white" />;
    case 'CHIEF_EXECUTIVE':
      return <Briefcase className="w-5 h-5 text-white" />;
    case 'LEAD_EXECUTIVE':
      return <Building2 className="w-5 h-5 text-white" />;
    case 'EXECUTIVE':
      return <Building2 className="w-5 h-5 text-white" />;
    case 'TEAM_LEAD':
      return <Users className="w-5 h-5 text-white" />;
    case 'DESK':
      return <Users className="w-5 h-5 text-white" />;
    default:
      return <Users className="w-5 h-5 text-white" />;
  }
};

const getNodeColor = (type: Organization['type']) => {
  switch (type) {
    case 'MINISTER':
      return 'bg-green-700';
    case 'STATE_MINISTER':
      return 'bg-green-600';
    case 'CHIEF_EXECUTIVE':
      return 'bg-green-600';
    case 'LEAD_EXECUTIVE':
      return 'bg-green-500';
    case 'EXECUTIVE':
      return 'bg-green-500';
    case 'TEAM_LEAD':
      return 'bg-green-400';
    case 'DESK':
      return 'bg-green-300';
    default:
      return 'bg-gray-500';
  }
};

const OrganizationNode: React.FC<{ org: Organization; level: number }> = ({ org, level }) => {
  const nodeColor = getNodeColor(org.type);
  
  return (
    <div className={`flex flex-col items-center ${level === 0 ? 'mb-8' : 'mb-4'}`}>
      <div className={`${nodeColor} text-white rounded-lg shadow-md p-3 w-48 flex flex-col items-center`}>
        <div className="rounded-full bg-white/20 p-2 mb-2">
          {getIcon(org.type)}
        </div>
        <div className="font-medium text-center">{org.name}</div>
        <div className="text-xs opacity-80">{org.type.replace('_', ' ')}</div>
      </div>
    </div>
  );
};

const OrganizationLevel: React.FC<{ 
  orgs: Organization[]; 
  level: number;
  parentWidth?: number;
}> = ({ orgs, level, parentWidth }) => {
  if (orgs.length === 0) return null;
  
  const width = parentWidth || 100;
  const itemWidth = width / orgs.length;
  
  return (
    <div className="flex justify-center w-full">
      {orgs.map((org, index) => (
        <div 
          key={org.id} 
          className="flex flex-col items-center"
          style={{ width: `${itemWidth}%` }}
        >
          <OrganizationNode org={org} level={level} />
        </div>
      ))}
    </div>
  );
};

const OrganizationChart: React.FC<OrganizationChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center p-4 text-gray-500">No organization data available</div>;
  }

  // Group organizations by level
  const rootOrgs = data.filter(org => !org.parent && !org.parentId);
  const stateMinisterOrgs = data.filter(org => org.type === 'STATE_MINISTER');
  const chiefExecutiveOrgs = data.filter(org => org.type === 'CHIEF_EXECUTIVE');
  const executiveOrgs = data.filter(org => 
    org.type === 'LEAD_EXECUTIVE' || org.type === 'EXECUTIVE'
  );
  const teamOrgs = data.filter(org => 
    org.type === 'TEAM_LEAD' || org.type === 'DESK'
  );

  return (
    <div className="organization-chart p-4 overflow-auto">
      <div className="flex flex-col items-center">
        <OrganizationLevel orgs={rootOrgs} level={0} />
        
        {stateMinisterOrgs.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <OrganizationLevel orgs={stateMinisterOrgs} level={1} />
          </>
        )}
        
        {chiefExecutiveOrgs.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <OrganizationLevel orgs={chiefExecutiveOrgs} level={1} />
          </>
        )}
        
        {executiveOrgs.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <OrganizationLevel orgs={executiveOrgs} level={2} />
          </>
        )}
        
        {teamOrgs.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <OrganizationLevel orgs={teamOrgs} level={3} />
          </>
        )}
      </div>
    </div>
  );
};

export default OrganizationChart;