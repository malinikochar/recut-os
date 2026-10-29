export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      job_parts: {
        Row: {
          allow_rotation: boolean;
          created_at: string;
          height_mm: number;
          id: string;
          job_id: string;
          label: string;
          material_id: string;
          notes: string | null;
          quantity: number;
          required_grain_axis: Database['public']['Enums']['grain_axis_enum'];
          updated_at: string;
          user_id: string;
          width_mm: number;
        };
        Insert: {
          allow_rotation?: boolean;
          created_at?: string;
          height_mm: number;
          id?: string;
          job_id: string;
          label: string;
          material_id: string;
          notes?: string | null;
          quantity: number;
          required_grain_axis?: Database['public']['Enums']['grain_axis_enum'];
          updated_at?: string;
          user_id: string;
          width_mm: number;
        };
        Update: {
          allow_rotation?: boolean;
          created_at?: string;
          height_mm?: number;
          id?: string;
          job_id?: string;
          label?: string;
          material_id?: string;
          notes?: string | null;
          quantity?: number;
          required_grain_axis?: Database['public']['Enums']['grain_axis_enum'];
          updated_at?: string;
          user_id?: string;
          width_mm?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'job_parts_job_owner_fk';
            columns: ['job_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'job_parts_material_owner_fk';
            columns: ['material_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'materials';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      jobs: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          status: Database['public']['Enums']['job_status_enum'];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['job_status_enum'];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['job_status_enum'];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          category: string;
          created_at: string;
          currency_code: string;
          default_kerf_mm: number;
          grain_axis: Database['public']['Enums']['grain_axis_enum'];
          id: string;
          min_reusable_height_mm: number;
          min_reusable_width_mm: number;
          name: string;
          price_per_sheet_minor: number;
          standard_height_mm: number;
          standard_width_mm: number;
          thickness_mm: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          currency_code?: string;
          default_kerf_mm: number;
          grain_axis?: Database['public']['Enums']['grain_axis_enum'];
          id?: string;
          min_reusable_height_mm: number;
          min_reusable_width_mm: number;
          name: string;
          price_per_sheet_minor: number;
          standard_height_mm: number;
          standard_width_mm: number;
          thickness_mm: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          currency_code?: string;
          default_kerf_mm?: number;
          grain_axis?: Database['public']['Enums']['grain_axis_enum'];
          id?: string;
          min_reusable_height_mm?: number;
          min_reusable_width_mm?: number;
          name?: string;
          price_per_sheet_minor?: number;
          standard_height_mm?: number;
          standard_width_mm?: number;
          thickness_mm?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      plan_sheets: {
        Row: {
          created_at: string;
          cut_tree: Json;
          cuts: Json;
          estimated_new_sheet_cost_minor: number;
          height_mm: number;
          id: string;
          kerf_mm: number;
          material_id: string;
          placements: Json;
          plan_id: string;
          sheet_index: number;
          sheet_metrics: Json;
          source_label: string;
          source_stock_id: string | null;
          source_type: Database['public']['Enums']['stock_source_type_enum'];
          unallocated_regions: Json;
          user_id: string;
          width_mm: number;
        };
        Insert: {
          created_at?: string;
          cut_tree: Json;
          cuts?: Json;
          estimated_new_sheet_cost_minor: number;
          height_mm: number;
          id?: string;
          kerf_mm: number;
          material_id: string;
          placements: Json;
          plan_id: string;
          sheet_index: number;
          sheet_metrics: Json;
          source_label: string;
          source_stock_id?: string | null;
          source_type: Database['public']['Enums']['stock_source_type_enum'];
          unallocated_regions: Json;
          user_id: string;
          width_mm: number;
        };
        Update: {
          created_at?: string;
          cut_tree?: Json;
          cuts?: Json;
          estimated_new_sheet_cost_minor?: number;
          height_mm?: number;
          id?: string;
          kerf_mm?: number;
          material_id?: string;
          placements?: Json;
          plan_id?: string;
          sheet_index?: number;
          sheet_metrics?: Json;
          source_label?: string;
          source_stock_id?: string | null;
          source_type?: Database['public']['Enums']['stock_source_type_enum'];
          unallocated_regions?: Json;
          user_id?: string;
          width_mm?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_sheets_material_owner_fk';
            columns: ['material_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'materials';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'plan_sheets_plan_owner_fk';
            columns: ['plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'plan_sheets_stock_owner_fk';
            columns: ['source_stock_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'stock_items';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      plans: {
        Row: {
          algorithm_seed: number;
          algorithm_version: string;
          baseline_result: Json;
          committed_at: string | null;
          comparison_summary: Json | null;
          constraints_snapshot: Json;
          created_at: string;
          currency_code: string;
          id: string;
          input_snapshot: Json;
          job_id: string;
          optimized_summary: Json;
          status: Database['public']['Enums']['plan_status_enum'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          algorithm_seed?: number;
          algorithm_version: string;
          baseline_result: Json;
          committed_at?: string | null;
          comparison_summary?: Json | null;
          constraints_snapshot: Json;
          created_at?: string;
          currency_code?: string;
          id?: string;
          input_snapshot: Json;
          job_id: string;
          optimized_summary: Json;
          status?: Database['public']['Enums']['plan_status_enum'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          algorithm_seed?: number;
          algorithm_version?: string;
          baseline_result?: Json;
          committed_at?: string | null;
          comparison_summary?: Json | null;
          constraints_snapshot?: Json;
          created_at?: string;
          currency_code?: string;
          id?: string;
          input_snapshot?: Json;
          job_id?: string;
          optimized_summary?: Json;
          status?: Database['public']['Enums']['plan_status_enum'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_job_owner_fk';
            columns: ['job_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      stock_items: {
        Row: {
          consumed_by_plan_id: string | null;
          created_at: string;
          created_from_plan_id: string | null;
          created_from_plan_sheet_id: string | null;
          height_mm: number;
          id: string;
          label: string;
          material_id: string;
          notes: string | null;
          origin: Database['public']['Enums']['stock_origin_enum'];
          state: Database['public']['Enums']['stock_state_enum'];
          updated_at: string;
          user_id: string;
          width_mm: number;
        };
        Insert: {
          consumed_by_plan_id?: string | null;
          created_at?: string;
          created_from_plan_id?: string | null;
          created_from_plan_sheet_id?: string | null;
          height_mm: number;
          id?: string;
          label: string;
          material_id: string;
          notes?: string | null;
          origin: Database['public']['Enums']['stock_origin_enum'];
          state?: Database['public']['Enums']['stock_state_enum'];
          updated_at?: string;
          user_id: string;
          width_mm: number;
        };
        Update: {
          consumed_by_plan_id?: string | null;
          created_at?: string;
          created_from_plan_id?: string | null;
          created_from_plan_sheet_id?: string | null;
          height_mm?: number;
          id?: string;
          label?: string;
          material_id?: string;
          notes?: string | null;
          origin?: Database['public']['Enums']['stock_origin_enum'];
          state?: Database['public']['Enums']['stock_state_enum'];
          updated_at?: string;
          user_id?: string;
          width_mm?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_items_consumed_plan_owner_fk';
            columns: ['consumed_by_plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'stock_items_created_plan_owner_fk';
            columns: ['created_from_plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'stock_items_created_plan_sheet_owner_fk';
            columns: ['created_from_plan_sheet_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plan_sheets';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'stock_items_material_owner_fk';
            columns: ['material_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'materials';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      commit_plan: { Args: { p_plan_id: string }; Returns: Json };
      confirm_remnant: {
        Args: {
          p_discard?: boolean;
          p_height_mm: number;
          p_stock_id: string;
          p_width_mm: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      grain_axis_enum: 'none' | 'x' | 'y';
      job_status_enum: 'draft' | 'planned' | 'committed';
      plan_status_enum: 'draft' | 'committed';
      stock_origin_enum: 'full_sheet' | 'remnant';
      stock_source_type_enum:
        | 'available_remnant'
        | 'available_full_sheet'
        | 'new_purchase';
      stock_state_enum: 'available' | 'pending_confirmation' | 'consumed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
