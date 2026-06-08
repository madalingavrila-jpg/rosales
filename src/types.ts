export type UserRole = "leader" | "agent";
export type SalesTeam = "density" | "complex";

export interface SessionUser {
  role: UserRole;
  agentId?: string;
  name: string;
  email?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface OverviewKpis {
  opportunitiesToday: number;
  closedWonMonth: number;
  closedLostMonth: number;
  activatedMonth: number;
  activePipeline: number;
  totalOpportunitiesMonth: number;
}

export interface StageRow {
  stage: string;
  count: number;
}

export interface RepMetric {
  name: string;
  email: string;
  opportunitiesMonth: number;
  closedWon: number;
  closedLost: number;
  activated: number;
  winRate: number;
}

export interface ActivationRep {
  name: string;
  email: string;
  team: SalesTeam;
  actual: number;
  target: number;
  progressPct: number;
}

export interface TeamActivations {
  team: SalesTeam;
  label: string;
  actual: number;
  target: number;
  progressPct: number;
  targetPerRep: number;
  reps: ActivationRep[];
}

export interface ActivationsKpi {
  totalActual: number;
  totalTarget: number;
  progressPct: number;
  teams: {
    density: TeamActivations;
    complex: TeamActivations;
  };
}

export interface DailyTrendPoint {
  date: string;
  closedWon: number;
  closedLost: number;
  newOpportunities: number;
}

export interface DashboardCache {
  syncedAt: string;
  sources: string[];
  periodLabel: string;
  overview: OverviewKpis;
  activationsKpi?: ActivationsKpi;
  stageBreakdown: StageRow[];
  repMetrics: RepMetric[];
  dailyTrend: DailyTrendPoint[];
}

export interface DashboardModel {
  meta: {
    syncedAt: string;
    sources: string[];
    periodLabel: string;
    role: UserRole;
    agentEmail?: string;
  };
  overview: OverviewKpis;
  activationsKpi: ActivationsKpi;
  stageBreakdown: StageRow[];
  repMetrics: RepMetric[];
  dailyTrend: DailyTrendPoint[];
}
