export interface TicketData {
  email: string;
  municipality: string;
  system: string;
  problem: string;
  solutions: string[];
  status: string;
  ticketCode: string;
  createdAt: string;
}

export interface CaseData {
  municipality?: string;
  system?: string;
  problem?: string;
  solutions?: string[];
  status?: string;
  ticketCode?: string;
}

export interface SolutionSet {
  solutions: string[];
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AudioVolumeState {
  inputVolume: number; // 0.0 to 1.0
  outputVolume: number; // 0.0 to 1.0
}