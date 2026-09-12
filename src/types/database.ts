/**
 * Tipos do banco de dados (espelham o schema das migrations).
 *
 * Mantidos a mao para tipar o cliente Supabase. Cada tabela/view inclui
 * `Relationships` e o schema inclui `Functions` para satisfazer o formato
 * `GenericSchema` esperado pelo supabase-js (sem isso o schema resolve para
 * `never` e as queries perdem a tipagem).
 *
 * Em producao voce pode regenerar com:
 *   supabase gen types typescript --local > src/types/database.ts
 */

export type CompetitionStatus =
  | 'planning'
  | 'registration_open'
  | 'ongoing'
  | 'finished'
  | 'archived';
export type SeasonStatus = 'upcoming' | 'active' | 'finished';
export type RegistrationStatus =
  | 'pending'
  | 'approved'
  | 'suspended'
  | 'irregular'
  | 'removed';
export type ConflictStatus = 'pending' | 'resolved';
export type TeamStatus = 'active' | 'inactive';
export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled';
export type MatchEventType = 'goal' | 'assist' | 'yellow_card' | 'red_card';

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admins']['Insert']>;
        Relationships: [];
      };
      competitions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          status: CompetitionStatus;
          points_win: number;
          points_draw: number;
          points_loss: number;
          tiebreakers: string[];
          regulation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          status?: CompetitionStatus;
          points_win?: number;
          points_draw?: number;
          points_loss?: number;
          tiebreakers?: string[];
          regulation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['competitions']['Insert']>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          competition_id: string;
          year: number;
          name: string | null;
          status: SeasonStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          year: number;
          name?: string | null;
          status?: SeasonStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['seasons']['Insert']>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          short_name: string | null;
          slug: string;
          logo_url: string | null;
          status: TeamStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string | null;
          slug: string;
          logo_url?: string | null;
          status?: TeamStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          name: string;
          nickname: string | null;
          mamoball_player_id: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          nickname?: string | null;
          mamoball_player_id: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          player_id: string;
          team_id: string;
          competition_id: string;
          season_id: string;
          status: RegistrationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          team_id: string;
          competition_id: string;
          season_id: string;
          status?: RegistrationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['registrations']['Insert']>;
        Relationships: [];
      };
      conflicts: {
        Row: {
          id: string;
          player_id: string;
          mamoball_player_id: string;
          competition_id: string;
          season_id: string;
          status: ConflictStatus;
          note: string | null;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          player_id: string;
          mamoball_player_id: string;
          competition_id: string;
          season_id: string;
          status?: ConflictStatus;
          note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['conflicts']['Insert']>;
        Relationships: [];
      };
      conflict_registrations: {
        Row: {
          conflict_id: string;
          registration_id: string;
          team_id: string;
        };
        Insert: {
          conflict_id: string;
          registration_id: string;
          team_id: string;
        };
        Update: Partial<
          Database['public']['Tables']['conflict_registrations']['Insert']
        >;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          data: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          data?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      season_teams: {
        Row: {
          id: string;
          competition_id: string;
          season_id: string;
          team_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          season_id: string;
          team_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['season_teams']['Insert']>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          competition_id: string;
          season_id: string;
          round: number | null;
          round_label: string | null;
          location: string | null;
          home_team_id: string | null;
          away_team_id: string | null;
          home_score: number | null;
          away_score: number | null;
          scheduled_at: string | null;
          status: MatchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          season_id: string;
          round?: number | null;
          round_label?: string | null;
          location?: string | null;
          home_team_id?: string | null;
          away_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          scheduled_at?: string | null;
          status?: MatchStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
        Relationships: [];
      };
      match_events: {
        Row: {
          id: string;
          match_id: string;
          competition_id: string;
          season_id: string;
          team_id: string;
          player_id: string | null;
          type: MatchEventType;
          minute: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          competition_id: string;
          season_id: string;
          team_id: string;
          player_id?: string | null;
          type: MatchEventType;
          minute?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_events']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      v_pending_conflicts: {
        Row: {
          conflict_id: string;
          player_id: string;
          mamoball_player_id: string;
          player_name: string;
          player_nickname: string | null;
          competition_id: string;
          competition_name: string;
          season_id: string;
          season_year: number;
          status: ConflictStatus;
          created_at: string;
          team_ids: string[];
          team_names: string[];
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      competition_status: CompetitionStatus;
      season_status: SeasonStatus;
      registration_status: RegistrationStatus;
      conflict_status: ConflictStatus;
      team_status: TeamStatus;
      match_status: MatchStatus;
      match_event_type: MatchEventType;
    };
  };
}

// Atalhos convenientes.
export type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
export type SeasonRow = Database['public']['Tables']['seasons']['Row'];
export type TeamRow = Database['public']['Tables']['teams']['Row'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type RegistrationRow =
  Database['public']['Tables']['registrations']['Row'];
export type ConflictRow = Database['public']['Tables']['conflicts']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type SeasonTeamRow = Database['public']['Tables']['season_teams']['Row'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];
export type MatchEventRow = Database['public']['Tables']['match_events']['Row'];
export type PendingConflictRow =
  Database['public']['Views']['v_pending_conflicts']['Row'];
