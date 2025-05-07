export interface TrainingCost {
  description: string;
  numberOfDays: number;
  numberOfParticipants: number;
  numberOfSessions: number;
  trainingLocation: TrainingLocation;
  additionalParticipantCosts: AdditionalParticipantCost[];
  additionalSessionCosts: AdditionalSessionCost[];
  transportRequired: boolean;
  landTransportParticipants?: number;
  airTransportParticipants?: number;
  otherCosts: number;
  justification?: string;
  totalBudget?: number;
}

export interface MeetingWorkshopCost {
  description: string;
  numberOfDays: number;
  numberOfParticipants: number;
  location: TrainingLocation;
  additionalParticipantCosts: AdditionalParticipantCost[];
  additionalSessionCosts: AdditionalSessionCost[];
  transportRequired: boolean;
  landTransportParticipants?: number;
  airTransportParticipants?: number;
  otherCosts: number;
  justification?: string;
  totalBudget?: number;
}

interface SupervisionCost {
  description: string;
  numberOfDays: number;
  numberOfSupervisors: number;
  numberOfSupervisorsWithAdditionalCost: number;
  additionalSupervisorCosts: SupervisorCost[];
  transportRequired: boolean;
  landTransportSupervisors?: number;
  airTransportSupervisors?: number;
  otherCosts: number;
  justification?: string;
  totalBudget?: number;
}

export interface PrintingCost {
  description: string;
  documentType: DocumentType;
  numberOfPages: number;
  numberOfCopies: number;
  otherCosts: number;
  justification?: string;
  totalBudget?: number;
}

export interface ProcurementCost {
  description: string;
  items: ProcurementItem[];
  otherCosts: number;
  justification?: string;
  totalBudget?: number;
}

interface ProcurementItem {
  itemType: ProcurementItemType;
  quantity: number;
  unitPrice: number;
}

type ProcurementItemType = 
  | 'Air_Freshner' | 'Air_Time' | 'Antivirus' | 'Bag' | 'Binding_Ring' | 'Broom'
  | 'Calculator' | 'Camera' | 'Car' | 'Carbon_Paper' | 'Car_Part' | 'Carpet'
  | 'Cassette' | 'CD' | 'CDMA' | 'Chair' | 'Cloth' | 'Cloth_Accessory'
  | 'Coat_Hanger' | 'Computer' | 'Copier' | 'Curtain' | 'Detergent' | 'Disinfectant'
  | 'Divider' | 'D_Link' | 'Dust_Bin' | 'Envelope' | 'External_Hard_Drive'
  | 'Fantastic_Glue' | 'Fax_Machine' | 'File_Cabinet' | 'File_Holder' | 'Flash_Disk'
  | 'Gawn_Tetron' | 'Generator' | 'Glove' | 'Hard_Disk' | 'Laminator' | 'Marker'
  | 'Mop' | 'Network_Cable' | 'Note_Book' | 'Note_Pad' | 'Paper' | 'Paper_Clip'
  | 'Paper_Fastener' | 'Paper_Punch' | 'Paper_Ream' | 'Stationary' | 'Printer'
  | 'Projector' | 'Rope' | 'Scanner' | 'Scouring_Powder' | 'Shelf' | 'Shoe'
  | 'Soap' | 'Surge_Arrestor' | 'Table' | 'Textile' | 'Toilet_Paper' | 'Toner'
  | 'T_Shirt' | 'Uhu' | 'UPS' | 'Vacuum_Cleaner' | 'Water_Filter';

export const PROCUREMENT_ITEMS: { value: ProcurementItemType; label: string; defaultPrice: number }[] = [
  { value: 'Air_Freshner', label: 'Air Freshner', defaultPrice: 150 },
  { value: 'Air_Time', label: 'Air Time', defaultPrice: 100 },
  { value: 'Antivirus', label: 'Antivirus', defaultPrice: 1500 },
  { value: 'Bag', label: 'Bag', defaultPrice: 800 },
  { value: 'Binding_Ring', label: 'Binding Ring', defaultPrice: 50 },
  { value: 'Broom', label: 'Broom', defaultPrice: 100 },
  { value: 'Calculator', label: 'Calculator', defaultPrice: 300 },
  { value: 'Camera', label: 'Camera', defaultPrice: 15000 },
  { value: 'Car', label: 'Car', defaultPrice: 2000000 },
  { value: 'Carbon_Paper', label: 'Carbon Paper', defaultPrice: 50 },
  { value: 'Car_Part', label: 'Car Part', defaultPrice: 5000 },
  { value: 'Carpet', label: 'Carpet', defaultPrice: 2000 },
  { value: 'Cassette', label: 'Cassette', defaultPrice: 100 },
  { value: 'CD', label: 'CD', defaultPrice: 50 },
  { value: 'CDMA', label: 'CDMA', defaultPrice: 2000 },
  { value: 'Chair', label: 'Chair', defaultPrice: 3000 },
  { value: 'Cloth', label: 'Cloth', defaultPrice: 1000 },
  { value: 'Cloth_Accessory', label: 'Cloth Accessory', defaultPrice: 500 },
  { value: 'Coat_Hanger', label: 'Coat Hanger', defaultPrice: 200 },
  { value: 'Computer', label: 'Computer', defaultPrice: 30000 },
  { value: 'Copier', label: 'Copier', defaultPrice: 50000 },
  { value: 'Curtain', label: 'Curtain', defaultPrice: 3000 },
  { value: 'Detergent', label: 'Detergent', defaultPrice: 100 },
  { value: 'Disinfectant', label: 'Disinfectant', defaultPrice: 200 },
  { value: 'Divider', label: 'Divider', defaultPrice: 100 },
  { value: 'D_Link', label: 'D-Link', defaultPrice: 1000 },
  { value: 'Dust_Bin', label: 'Dust Bin', defaultPrice: 300 },
  { value: 'Envelope', label: 'Envelope', defaultPrice: 10 },
  { value: 'External_Hard_Drive', label: 'External Hard Drive', defaultPrice: 3000 },
  { value: 'Fantastic_Glue', label: 'Fantastic Glue', defaultPrice: 50 },
  { value: 'Fax_Machine', label: 'Fax Machine', defaultPrice: 10000 },
  { value: 'File_Cabinet', label: 'File Cabinet', defaultPrice: 5000 },
  { value: 'File_Holder', label: 'File Holder', defaultPrice: 200 },
  { value: 'Flash_Disk', label: 'Flash Disk', defaultPrice: 500 },
  { value: 'Gawn_Tetron', label: 'Gawn Tetron', defaultPrice: 2000 },
  { value: 'Generator', label: 'Generator', defaultPrice: 50000 },
  { value: 'Glove', label: 'Glove', defaultPrice: 100 },
  { value: 'Hard_Disk', label: 'Hard Disk', defaultPrice: 2000 },
  { value: 'Laminator', label: 'Laminator', defaultPrice: 5000 },
  { value: 'Marker', label: 'Marker', defaultPrice: 50 },
  { value: 'Mop', label: 'Mop', defaultPrice: 200 },
  { value: 'Network_Cable', label: 'Network Cable', defaultPrice: 1000 },
  { value: 'Note_Book', label: 'Note Book', defaultPrice: 100 },
  { value: 'Note_Pad', label: 'Note Pad', defaultPrice: 50 },
  { value: 'Paper', label: 'Paper', defaultPrice: 200 },
  { value: 'Paper_Clip', label: 'Paper Clip', defaultPrice: 20 },
  { value: 'Paper_Fastener', label: 'Paper Fastener', defaultPrice: 30 },
  { value: 'Paper_Punch', label: 'Paper Punch', defaultPrice: 300 },
  { value: 'Paper_Ream', label: 'Paper Ream', defaultPrice: 400 },
  { value: 'Stationary', label: 'Stationary', defaultPrice: 500 },
  { value: 'Printer', label: 'Printer', defaultPrice: 20000 },
  { value: 'Projector', label: 'Projector', defaultPrice: 30000 },
  { value: 'Rope', label: 'Rope', defaultPrice: 100 },
  { value: 'Scanner', label: 'Scanner', defaultPrice: 15000 },
  { value: 'Scouring_Powder', label: 'Scouring Powder', defaultPrice: 100 },
  { value: 'Shelf', label: 'Shelf', defaultPrice: 3000 },
  { value: 'Shoe', label: 'Shoe', defaultPrice: 2000 },
  { value: 'Soap', label: 'Soap', defaultPrice: 50 },
  { value: 'Surge_Arrestor', label: 'Surge Arrestor', defaultPrice: 1000 },
  { value: 'Table', label: 'Table', defaultPrice: 4000 },
  { value: 'Textile', label: 'Textile', defaultPrice: 1000 },
  { value: 'Toilet_Paper', label: 'Toilet Paper', defaultPrice: 100 },
  { value: 'Toner', label: 'Toner', defaultPrice: 5000 },
  { value: 'T_Shirt', label: 'T-Shirt', defaultPrice: 500 },
  { value: 'Uhu', label: 'Uhu', defaultPrice: 100 },
  { value: 'UPS', label: 'UPS', defaultPrice: 3000 },
  { value: 'Vacuum_Cleaner', label: 'Vacuum Cleaner', defaultPrice: 10000 },
  { value: 'Water_Filter', label: 'Water Filter', defaultPrice: 5000 }
];

type DocumentType = 'Manual' | 'Booklet' | 'Leaflet' | 'Brochure';

export const DOCUMENT_TYPES: { value: DocumentType; label: string; costPerPage: number }[] = [
  { value: 'Manual', label: 'Manual/Guidelines', costPerPage: 50 },
  { value: 'Booklet', label: 'Booklet', costPerPage: 40 },
  { value: 'Leaflet', label: 'Leaflet/Flier', costPerPage: 30 },
  { value: 'Brochure', label: 'Brochure', costPerPage: 35 }
];

type SupervisorCost = 'MobileCard300' | 'MobileCard500' | 'Stationary' | 'All';

export const SUPERVISOR_COSTS: { value: SupervisorCost; label: string; amount: number }[] = [
  { value: 'MobileCard300', label: 'Mobile Card (300 birr)', amount: 300 },
  { value: 'MobileCard500', label: 'Mobile Card (500 birr)', amount: 500 },
  { value: 'Stationary', label: 'Stationary (Writing Pad and Pen)', amount: 200 },
  { value: 'All', label: 'All', amount: 0 }
];

type TrainingLocation = 'Addis_Ababa' | 'Adama' | 'Bahirdar' | 'Mekele' | 'Hawassa' | 'Gambella' | 'Afar' | 'Somali';

type AdditionalParticipantCost = 'Flash_Disk' | 'Stationary' | 'All';
type AdditionalSessionCost = 'Flip_Chart' | 'Marker' | 'Toner_Paper' | 'All';

interface CostingAssumption {
  id: string;
  activity_type: ActivityType;
  location: TrainingLocation;
  cost_type: string;
  amount: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const TRAINING_LOCATIONS: { value: TrainingLocation; label: string }[] = [
  { value: 'Addis_Ababa', label: 'Addis Ababa' },
  { value: 'Adama', label: 'Adama' },
  { value: 'Bahirdar', label: 'Bahirdar' },
  { value: 'Mekele', label: 'Mekele' },
  { value: 'Hawassa', label: 'Hawassa' },
  { value: 'Gambella', label: 'Gambella' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Somali', label: 'Somali' }
];

export const PARTICIPANT_COSTS: { value: AdditionalParticipantCost; label: string }[] = [
  { value: 'Flash_Disk', label: 'Flash Disk' },
  { value: 'Stationary', label: 'Stationary (Writing Pad and Pen)' },
  { value: 'All', label: 'All' }
];

export const SESSION_COSTS: { value: AdditionalSessionCost; label: string }[] = [
  { value: 'Flip_Chart', label: 'Flip Chart' },
  { value: 'Marker', label: 'Marker' },
  { value: 'Toner_Paper', label: 'Toner and Ream of Paper' },
  { value: 'All', label: 'All' }
];

export const COST_ASSUMPTIONS = {
  perDiem: {
    Addis_Ababa: 1200,
    Adama: 1000,
    Bahirdar: 1100,
    Mekele: 1100,
    Hawassa: 1000,
    Gambella: 1200,
    Afar: 1200,
    Somali: 1200
  },
  accommodation: {
    Addis_Ababa: 1500,
    Adama: 1200,
    Bahirdar: 1300,
    Mekele: 1300,
    Hawassa: 1200,
    Gambella: 1400,
    Afar: 1400,
    Somali: 1400
  },
  transport: {
    land: 1000,
    air: 5000
  },
  participantCosts: {
    Flash_Disk: 500,
    Stationary: 200
  },
  sessionCosts: {
    Flip_Chart: 300,
    Marker: 150,
    Toner_Paper: 1000
  },
  venue: {
    Addis_Ababa: 5000,
    Adama: 4000,
    Bahirdar: 4500,
    Mekele: 4500,
    Hawassa: 4000,
    Gambella: 4500,
    Afar: 4500,
    Somali: 4500
  }
};