export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_lojista_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_lojista_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_lojista_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          lojista_id: string | null
          payload: Json | null
          read_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          lojista_id?: string | null
          payload?: Json | null
          read_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          lojista_id?: string | null
          payload?: Json | null
          read_at?: string | null
          type?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          granted_days: number
          id: string
          lojista_id: string
          redeemed_at: string
        }
        Insert: {
          coupon_id: string
          granted_days: number
          id?: string
          lojista_id: string
          redeemed_at?: string
        }
        Update: {
          coupon_id?: string
          granted_days?: number
          id?: string
          lojista_id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string
          duration_days: number
          expires_at: string | null
          id: string
          max_uses: number
          notes: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          duration_days: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      lead_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          lead_id: string
          lojista_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lead_id: string
          lojista_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lead_id?: string
          lojista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status: {
        Row: {
          id: string
          lead_id: string
          lojista_id: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          lojista_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          lojista_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ano_max: number | null
          ano_min: number | null
          caixa: string | null
          client_token: string
          combustivel: string | null
          cor: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string
          expires_at: string
          extras: string | null
          fechado: boolean
          fechado_at: string | null
          financiamento_entrada: number | null
          financiamento_prestacao: number | null
          forma_pagamento: string | null
          id: string
          km_max: number | null
          localizacao: string
          marca_modelo: string | null
          marcas_preferidas: string | null
          nome: string
          observacoes: string | null
          precisa_financiamento: boolean
          preco_max: number | null
          propostas_count: number
          retoma_ano: number | null
          retoma_caixa: string | null
          retoma_combustivel: string | null
          retoma_estado: string | null
          retoma_fotos: string[] | null
          retoma_fotos_danos: string[] | null
          retoma_km: number | null
          retoma_marca: string | null
          retoma_modelo: string | null
          retoma_observacoes: string | null
          retoma_tem_danos: boolean | null
          retoma_valor_esperado: number | null
          situacao_profissional: string | null
          situacao_profissional_outros: string | null
          situacao_residencia: string | null
          tem_carro_especifico: boolean | null
          tem_retoma: boolean
          tipo_carro: string | null
          tipo_compra: string | null
          urgencia: string | null
          versao: string | null
          whatsapp: string
        }
        Insert: {
          ano_max?: number | null
          ano_min?: number | null
          caixa?: string | null
          client_token?: string
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          expires_at?: string
          extras?: string | null
          fechado?: boolean
          fechado_at?: string | null
          financiamento_entrada?: number | null
          financiamento_prestacao?: number | null
          forma_pagamento?: string | null
          id?: string
          km_max?: number | null
          localizacao: string
          marca_modelo?: string | null
          marcas_preferidas?: string | null
          nome: string
          observacoes?: string | null
          precisa_financiamento?: boolean
          preco_max?: number | null
          propostas_count?: number
          retoma_ano?: number | null
          retoma_caixa?: string | null
          retoma_combustivel?: string | null
          retoma_estado?: string | null
          retoma_fotos?: string[] | null
          retoma_fotos_danos?: string[] | null
          retoma_km?: number | null
          retoma_marca?: string | null
          retoma_modelo?: string | null
          retoma_observacoes?: string | null
          retoma_tem_danos?: boolean | null
          retoma_valor_esperado?: number | null
          situacao_profissional?: string | null
          situacao_profissional_outros?: string | null
          situacao_residencia?: string | null
          tem_carro_especifico?: boolean | null
          tem_retoma?: boolean
          tipo_carro?: string | null
          tipo_compra?: string | null
          urgencia?: string | null
          versao?: string | null
          whatsapp: string
        }
        Update: {
          ano_max?: number | null
          ano_min?: number | null
          caixa?: string | null
          client_token?: string
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          expires_at?: string
          extras?: string | null
          fechado?: boolean
          fechado_at?: string | null
          financiamento_entrada?: number | null
          financiamento_prestacao?: number | null
          forma_pagamento?: string | null
          id?: string
          km_max?: number | null
          localizacao?: string
          marca_modelo?: string | null
          marcas_preferidas?: string | null
          nome?: string
          observacoes?: string | null
          precisa_financiamento?: boolean
          preco_max?: number | null
          propostas_count?: number
          retoma_ano?: number | null
          retoma_caixa?: string | null
          retoma_combustivel?: string | null
          retoma_estado?: string | null
          retoma_fotos?: string[] | null
          retoma_fotos_danos?: string[] | null
          retoma_km?: number | null
          retoma_marca?: string | null
          retoma_modelo?: string | null
          retoma_observacoes?: string | null
          retoma_tem_danos?: boolean | null
          retoma_valor_esperado?: number | null
          situacao_profissional?: string | null
          situacao_profissional_outros?: string | null
          situacao_residencia?: string | null
          tem_carro_especifico?: boolean | null
          tem_retoma?: boolean
          tipo_carro?: string | null
          tipo_compra?: string | null
          urgencia?: string | null
          versao?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      lojistas: {
        Row: {
          aceita_particular: boolean
          aceita_retoma: boolean
          aceita_revenda: boolean
          activated_via: string | null
          cidade: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          doc_atividade_url: string | null
          doc_fachada_url: string | null
          doc_morada_url: string | null
          doc_responsavel_url: string | null
          email: string
          empresa: string
          faixa_preco: string
          faz_financiamento: boolean
          id: string
          localizacao: string
          marcas: string
          morada: string | null
          nif: string
          nome_responsavel: string | null
          regiao: string | null
          status: string
          subscription_active: boolean
          telefone: string | null
          tem_garantia: boolean
          tipo_veiculos: string
          tipos_carro: string | null
          trial_ends_at: string
          website: string | null
          whatsapp: string
        }
        Insert: {
          aceita_particular?: boolean
          aceita_retoma?: boolean
          aceita_revenda?: boolean
          activated_via?: string | null
          cidade?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          doc_atividade_url?: string | null
          doc_fachada_url?: string | null
          doc_morada_url?: string | null
          doc_responsavel_url?: string | null
          email: string
          empresa: string
          faixa_preco: string
          faz_financiamento?: boolean
          id: string
          localizacao: string
          marcas: string
          morada?: string | null
          nif: string
          nome_responsavel?: string | null
          regiao?: string | null
          status?: string
          subscription_active?: boolean
          telefone?: string | null
          tem_garantia?: boolean
          tipo_veiculos: string
          tipos_carro?: string | null
          trial_ends_at?: string
          website?: string | null
          whatsapp: string
        }
        Update: {
          aceita_particular?: boolean
          aceita_retoma?: boolean
          aceita_revenda?: boolean
          activated_via?: string | null
          cidade?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          doc_atividade_url?: string | null
          doc_fachada_url?: string | null
          doc_morada_url?: string | null
          doc_responsavel_url?: string | null
          email?: string
          empresa?: string
          faixa_preco?: string
          faz_financiamento?: boolean
          id?: string
          localizacao?: string
          marcas?: string
          morada?: string | null
          nif?: string
          nome_responsavel?: string | null
          regiao?: string | null
          status?: string
          subscription_active?: boolean
          telefone?: string | null
          tem_garantia?: boolean
          tipo_veiculos?: string
          tipos_carro?: string | null
          trial_ends_at?: string
          website?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      proposta_negociacoes: {
        Row: {
          created_at: string
          id: string
          mensagem: string | null
          origem: string
          preco_proposto: number | null
          proposta_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem?: string | null
          origem: string
          preco_proposto?: number | null
          proposta_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string | null
          origem?: string
          preco_proposto?: number | null
          proposta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposta_negociacoes_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          aceita_at: string | null
          aceita_retoma: boolean
          ano: number | null
          caixa: string | null
          combustivel: string | null
          condicoes_financiamento: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          disponibilidade: string | null
          distrito: string | null
          extras: string | null
          fotos: string[] | null
          garantia_meses: number | null
          historico_manutencao: boolean | null
          id: string
          km: number | null
          lead_id: string
          link_anuncio: string | null
          lojista_id: string
          marca_modelo: string | null
          mensagem: string
          motivo_recusa: string | null
          oferece_financiamento: boolean
          preco: number
          recusada_at: string | null
          revisao_recente: boolean | null
          status: string
          tem_garantia: boolean
          valor_retoma: number | null
          visualizada_at: string | null
        }
        Insert: {
          aceita_at?: string | null
          aceita_retoma?: boolean
          ano?: number | null
          caixa?: string | null
          combustivel?: string | null
          condicoes_financiamento?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          disponibilidade?: string | null
          distrito?: string | null
          extras?: string | null
          fotos?: string[] | null
          garantia_meses?: number | null
          historico_manutencao?: boolean | null
          id?: string
          km?: number | null
          lead_id: string
          link_anuncio?: string | null
          lojista_id: string
          marca_modelo?: string | null
          mensagem: string
          motivo_recusa?: string | null
          oferece_financiamento?: boolean
          preco: number
          recusada_at?: string | null
          revisao_recente?: boolean | null
          status?: string
          tem_garantia?: boolean
          valor_retoma?: number | null
          visualizada_at?: string | null
        }
        Update: {
          aceita_at?: string | null
          aceita_retoma?: boolean
          ano?: number | null
          caixa?: string | null
          combustivel?: string | null
          condicoes_financiamento?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          disponibilidade?: string | null
          distrito?: string | null
          extras?: string | null
          fotos?: string[] | null
          garantia_meses?: number | null
          historico_manutencao?: boolean | null
          id?: string
          km?: number | null
          lead_id?: string
          link_anuncio?: string | null
          lojista_id?: string
          marca_modelo?: string | null
          mensagem?: string
          motivo_recusa?: string | null
          oferece_financiamento?: boolean
          preco?: number
          recusada_at?: string | null
          revisao_recente?: boolean | null
          status?: string
          tem_garantia?: boolean
          valor_retoma?: number | null
          visualizada_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lojista_id_fkey"
            columns: ["lojista_id"]
            isOneToOne: false
            referencedRelation: "lojistas"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_stats: { Args: { _period?: string }; Returns: Json }
      admin_get_propostas_with_email: {
        Args: { _limit?: number }
        Returns: Json
      }
      admin_lead_full_history: { Args: { _lead_id: string }; Returns: Json }
      admin_leads_overview: {
        Args: { _period?: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          ignorados_count: number
          localizacao: string
          nome: string
          preco_max: number
          propostas_count: number
          state: string
          tipo_compra: string
        }[]
      }
      admin_soft_delete_lead: {
        Args: { _lead_id: string; _reason?: string }
        Returns: Json
      }
      admin_soft_delete_lojista: {
        Args: { _lojista_id: string; _reason?: string }
        Returns: Json
      }
      admin_soft_delete_proposta: {
        Args: { _proposta_id: string; _reason?: string }
        Returns: Json
      }
      check_coupon: { Args: { _code: string }; Returns: Json }
      client_close_lead: { Args: { _token: string }; Returns: Json }
      client_decide_proposta: {
        Args: {
          _decisao: string
          _motivo?: string
          _proposta_id: string
          _token: string
        }
        Returns: Json
      }
      client_get_propostas: { Args: { _token: string }; Returns: Json }
      client_negociar_proposta: {
        Args: {
          _mensagem?: string
          _preco: number
          _proposta_id: string
          _token: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_leads_for_lojista: {
        Args: never
        Returns: {
          ano_max: number
          ano_min: number
          caixa: string
          combustivel: string
          cor: string
          created_at: string
          email: string
          expires_at: string
          extras: string
          financiamento_entrada: number
          financiamento_prestacao: number
          forma_pagamento: string
          id: string
          km_max: number
          localizacao: string
          marca_modelo: string
          marcas_preferidas: string
          nome: string
          observacoes: string
          precisa_financiamento: boolean
          preco_max: number
          propostas_count: number
          retoma_ano: number
          retoma_caixa: string
          retoma_combustivel: string
          retoma_estado: string
          retoma_fotos: string[]
          retoma_km: number
          retoma_marca: string
          retoma_modelo: string
          retoma_observacoes: string
          retoma_valor_esperado: number
          situacao_profissional: string
          situacao_profissional_outros: string
          situacao_residencia: string
          tem_retoma: boolean
          tipo_carro: string
          tipo_compra: string
          urgencia: string
          versao: string
          whatsapp: string
        }[]
      }
      get_my_proposta_email_logs: {
        Args: { _lead_id?: string }
        Returns: {
          created_at: string
          error_message: string
          id: string
          message_id: string
          status: string
        }[]
      }
      grant_lojista_access: {
        Args: { _days: number; _lojista_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lead_state: { Args: { _lead_id: string }; Returns: string }
      lojista_get_client_token: { Args: { _lead_id: string }; Returns: string }
      lojista_get_lead_contact: { Args: { _lead_id: string }; Returns: Json }
      lojista_get_propostas: { Args: never; Returns: Json }
      lojista_is_active: { Args: { _user_id: string }; Returns: boolean }
      lojista_responder_contraproposta: {
        Args: {
          _decisao: string
          _mensagem?: string
          _preco?: number
          _proposta_id: string
        }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_coupon: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "lojista" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["lojista", "admin"],
    },
  },
} as const
