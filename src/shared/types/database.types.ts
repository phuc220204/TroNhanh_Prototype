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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contracts: {
        Row: {
          created_at: string
          deleted_at: string | null
          deposit: number
          end_date: string
          id: string
          occupancy_id: string
          owner_id: string
          rent_price: number
          room_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deposit: number
          end_date: string
          id?: string
          occupancy_id: string
          owner_id: string
          rent_price: number
          room_id: string
          start_date: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deposit?: number
          end_date?: string
          id?: string
          occupancy_id?: string
          owner_id?: string
          rent_price?: number
          room_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_occupancy_id_fkey"
            columns: ["occupancy_id"]
            isOneToOne: false
            referencedRelation: "occupancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          initiator_id: string
          initiator_unread: number
          last_message_at: string
          last_message_preview: string | null
          poster_id: string
          poster_unread: number
          ref_id: string
          ref_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id: string
          initiator_unread?: number
          last_message_at?: string
          last_message_preview?: string | null
          poster_id: string
          poster_unread?: number
          ref_id: string
          ref_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string
          initiator_unread?: number
          last_message_at?: string
          last_message_preview?: string | null
          poster_id?: string
          poster_unread?: number
          ref_id?: string
          ref_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      demand_posts: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          current_address: string | null
          deleted_at: string | null
          description: string | null
          desired_amenities: string[]
          desired_districts: string[]
          district: string | null
          expire_at: string | null
          gender_requirement: string | null
          id: string
          kind: string
          min_area: number | null
          move_in_date: string | null
          needed_count: number | null
          occupant_count: number | null
          price_max: number
          price_min: number
          property_type: string | null
          rejection_reason: string | null
          renter_id: string
          requirements: string[]
          share_price: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          current_address?: string | null
          deleted_at?: string | null
          description?: string | null
          desired_amenities?: string[]
          desired_districts: string[]
          district?: string | null
          expire_at?: string | null
          gender_requirement?: string | null
          id?: string
          kind: string
          min_area?: number | null
          move_in_date?: string | null
          needed_count?: number | null
          occupant_count?: number | null
          price_max: number
          price_min: number
          property_type?: string | null
          rejection_reason?: string | null
          renter_id: string
          requirements?: string[]
          share_price?: number | null
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          current_address?: string | null
          deleted_at?: string | null
          description?: string | null
          desired_amenities?: string[]
          desired_districts?: string[]
          district?: string | null
          expire_at?: string | null
          gender_requirement?: string | null
          id?: string
          kind?: string
          min_area?: number | null
          move_in_date?: string | null
          needed_count?: number | null
          occupant_count?: number | null
          price_max?: number
          price_min?: number
          property_type?: string | null
          rejection_reason?: string | null
          renter_id?: string
          requirements?: string[]
          share_price?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          quantity: number
          type: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          type: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          type?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          contract_id: string | null
          created_at: string
          deleted_at: string | null
          due_date: string
          id: string
          owner_id: string
          period: string
          room_id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date: string
          id?: string
          owner_id: string
          period: string
          room_id: string
          status: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          owner_id?: string
          period?: string
          room_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_amenities: {
        Row: {
          amenity: string
          created_at: string
          id: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          amenity: string
          created_at?: string
          id?: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          amenity?: string
          created_at?: string
          id?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_amenities_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "rental_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          created_at: string
          height: number | null
          id: string
          listing_id: string
          mime_type: string | null
          size_bytes: number | null
          sort_order: number
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          listing_id: string
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          listing_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "rental_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      occupancies: {
        Row: {
          contract_id: string | null
          created_at: string
          deleted_at: string | null
          end_date: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_primary: boolean
          link_status: string | null
          occupant_count: number | null
          owner_id: string
          phone_number: string | null
          room_id: string | null
          start_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          link_status?: string | null
          occupant_count?: number | null
          owner_id: string
          phone_number?: string | null
          room_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean
          link_status?: string | null
          occupant_count?: number | null
          owner_id?: string
          phone_number?: string | null
          room_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "occupancies_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupancies_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          method: string
          owner_id: string
          paid_at: string
          purpose: string
          updated_at: string
          user_subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          method: string
          owner_id: string
          paid_at?: string
          purpose: string
          updated_at?: string
          user_subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: string
          owner_id?: string
          paid_at?: string
          purpose?: string
          updated_at?: string
          user_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_subscription_id_fkey"
            columns: ["user_subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_phone: string | null
          created_at: string
          full_name: string | null
          id: string
          is_seller: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_seller?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_seller?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          avg_rating: number | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          deleted_at: string | null
          district: string | null
          electricity_unit_price: number
          floor_count: number | null
          id: string
          is_public_profile_enabled: boolean
          name: string
          owner_id: string
          public_slug: string | null
          review_count: number
          service_fee: number
          updated_at: string
          water_unit_price: number
        }
        Insert: {
          address?: string | null
          avg_rating?: number | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          electricity_unit_price?: number
          floor_count?: number | null
          id?: string
          is_public_profile_enabled?: boolean
          name: string
          owner_id: string
          public_slug?: string | null
          review_count?: number
          service_fee?: number
          updated_at?: string
          water_unit_price?: number
        }
        Update: {
          address?: string | null
          avg_rating?: number | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          electricity_unit_price?: number
          floor_count?: number | null
          id?: string
          is_public_profile_enabled?: boolean
          name?: string
          owner_id?: string
          public_slug?: string | null
          review_count?: number
          service_fee?: number
          updated_at?: string
          water_unit_price?: number
        }
        Relationships: []
      }
      rental_listings: {
        Row: {
          access_close_time: string | null
          access_open_time: string | null
          access_policy: string | null
          address: string | null
          approved_at: string | null
          area: number
          boost_expire_at: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          deposit: number | null
          description: string | null
          district: string
          electricity_price: number | null
          expire_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          moderated_at: string | null
          moderated_by: string | null
          price: number
          property_id: string | null
          property_type: string
          rejection_reason: string | null
          room_id: string | null
          seller_id: string
          service_price: number | null
          status: string
          title: string
          updated_at: string
          view_count: number
          water_price: number | null
          water_unit: string | null
        }
        Insert: {
          access_close_time?: string | null
          access_open_time?: string | null
          access_policy?: string | null
          address?: string | null
          approved_at?: string | null
          area: number
          boost_expire_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit?: number | null
          description?: string | null
          district: string
          electricity_price?: number | null
          expire_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          moderated_at?: string | null
          moderated_by?: string | null
          price: number
          property_id?: string | null
          property_type: string
          rejection_reason?: string | null
          room_id?: string | null
          seller_id: string
          service_price?: number | null
          status: string
          title: string
          updated_at?: string
          view_count?: number
          water_price?: number | null
          water_unit?: string | null
        }
        Update: {
          access_close_time?: string | null
          access_open_time?: string | null
          access_policy?: string | null
          address?: string | null
          approved_at?: string | null
          area?: number
          boost_expire_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit?: number | null
          description?: string | null
          district?: string
          electricity_price?: number | null
          expire_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          moderated_at?: string | null
          moderated_by?: string | null
          price?: number
          property_id?: string | null
          property_type?: string
          rejection_reason?: string | null
          room_id?: string | null
          seller_id?: string
          service_price?: number | null
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
          water_price?: number | null
          water_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_listings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_user_id: string
          content: string | null
          contract_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          property_id: string
          rating: number
          report_count: number
          seller_replied_at: string | null
          seller_reply: string | null
          status: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          content?: string | null
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          property_id: string
          rating: number
          report_count?: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          content?: string | null
          contract_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          property_id?: string
          rating?: number
          report_count?: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          area: number
          created_at: string
          deleted_at: string | null
          description: string | null
          floor: number | null
          id: string
          owner_id: string
          price: number
          property_id: string
          room_code: string
          status: string
          updated_at: string
        }
        Insert: {
          area: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          floor?: number | null
          id?: string
          owner_id: string
          price: number
          property_id: string
          room_code: string
          status: string
          updated_at?: string
        }
        Update: {
          area?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          floor?: number | null
          id?: string
          owner_id?: string
          price?: number
          property_id?: string
          room_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          duration_months: number
          id: string
          max_properties: number
          max_rooms: number
          name: string
          price: number
          renewal_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_months: number
          id?: string
          max_properties: number
          max_rooms: number
          name: string
          price: number
          renewal_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_months?: number
          id?: string
          max_properties?: number
          max_rooms?: number
          name?: string
          price?: number
          renewal_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expire_date: string
          id: string
          plan_id: string | null
          seller_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expire_date: string
          id?: string
          plan_id?: string | null
          seller_id: string
          start_date: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expire_date?: string
          id?: string
          plan_id?: string | null
          seller_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_readings: {
        Row: {
          created_at: string
          current_reading: number
          deleted_at: string | null
          id: string
          owner_id: string
          period: string
          previous_reading: number
          room_id: string
          type: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_reading: number
          deleted_at?: string | null
          id?: string
          owner_id: string
          period: string
          previous_reading: number
          room_id: string
          type: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_reading?: number
          deleted_at?: string | null
          id?: string
          owner_id?: string
          period?: string
          previous_reading?: number
          room_id?: string
          type?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_readings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      property_public_profiles: {
        Row: {
          avg_rating: number | null
          district: string | null
          id: string | null
          name: string | null
          public_slug: string | null
          review_count: number | null
        }
        Insert: {
          avg_rating?: number | null
          district?: string | null
          id?: string | null
          name?: string | null
          public_slug?: string | null
          review_count?: number | null
        }
        Update: {
          avg_rating?: number | null
          district?: string | null
          id?: string | null
          name?: string | null
          public_slug?: string | null
          review_count?: number | null
        }
        Relationships: []
      }
      public_demand_posts: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          current_address: string | null
          description: string | null
          desired_amenities: string[] | null
          desired_districts: string[] | null
          district: string | null
          expire_at: string | null
          gender_requirement: string | null
          id: string | null
          kind: string | null
          min_area: number | null
          move_in_date: string | null
          needed_count: number | null
          occupant_count: number | null
          price_max: number | null
          price_min: number | null
          property_type: string | null
          renter_id: string | null
          renter_name: string | null
          requirements: string[] | null
          share_price: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_occupant_to_contract: {
        Args: { p_contract_id: string; p_occupant: Json }
        Returns: string
      }
      admin_dashboard_stats: {
        Args: never
        Returns: {
          active_listings: number
          pending_listings: number
          reported_reviews: number
          total_users: number
        }[]
      }
      admin_list_users: {
        Args: { p_search?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_seller: boolean
          roles: string[]
          user_id: string
        }[]
      }
      can_review_contract: {
        Args: { p_contract: string; p_user: string }
        Returns: boolean
      }
      confirm_occupancy_link: {
        Args: { p_accept: boolean; p_occupancy_id: string }
        Returns: undefined
      }
      create_invoice_with_items: {
        Args: {
          p_contract_id: string
          p_due_date: string
          p_items: Json
          p_period: string
          p_room_id: string
        }
        Returns: string
      }
      create_listing_with_details: {
        Args: {
          p_amenities?: string[]
          p_listing: Json
          p_media?: Json
          p_submit?: boolean
        }
        Returns: string
      }
      create_occupancy_with_contract: {
        Args: { p_contract: Json; p_occupant: Json; p_room_id: string }
        Returns: Json
      }
      demo_enable_public_profiles: { Args: never; Returns: number }
      demo_link_me_to_seeded_occupancy: {
        Args: { p_property_id?: string }
        Returns: string
      }
      get_my_conversations: {
        Args: never
        Returns: {
          created_at: string
          id: string
          initiator_id: string
          initiator_unread: number
          last_message_at: string
          last_message_preview: string
          partner_id: string
          partner_name: string
          poster_id: string
          poster_unread: number
          ref_id: string
          ref_title: string
          ref_type: string
          status: string
          updated_at: string
        }[]
      }
      get_my_properties_review_summary: {
        Args: never
        Returns: {
          avg_rating: number
          district: string
          is_public_profile: boolean
          property_id: string
          property_name: string
          public_slug: string
          review_count: number
        }[]
      }
      get_my_stays: {
        Args: never
        Returns: {
          can_review: boolean
          contract_id: string
          contract_status: string
          deposit: number
          end_date: string
          is_public_profile: boolean
          link_status: string
          occupancy_id: string
          occupant_name: string
          property_district: string
          property_id: string
          property_name: string
          public_slug: string
          rent_price: number
          review_content: string
          review_created_at: string
          review_id: string
          review_rating: number
          room_code: string
          room_id: string
          start_date: string
        }[]
      }
      grant_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      has_role: { Args: { p_role: string; p_user: string }; Returns: boolean }
      hide_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: undefined
      }
      is_contract_occupant: { Args: { p_contract: string }; Returns: boolean }
      is_linked_occupant: { Args: { p_occupancy: string }; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      is_property_public: { Args: { p_property: string }; Returns: boolean }
      link_renter_account: {
        Args: { p_email: string; p_occupancy_id: string }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      moderate_listing: {
        Args: { p_action: string; p_listing_id: string; p_reason?: string }
        Returns: undefined
      }
      owns_property: { Args: { p_property: string }; Returns: boolean }
      owns_room: { Args: { p_room: string }; Returns: boolean }
      post_review: {
        Args: { p_content?: string; p_contract_id: string; p_rating: number }
        Returns: string
      }
      record_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method: string
          p_paid_at?: string
        }
        Returns: string
      }
      record_utility_reading: {
        Args: {
          p_current: number
          p_period: string
          p_room_id: string
          p_type: string
        }
        Returns: string
      }
      reply_to_review: {
        Args: { p_reply: string; p_review_id: string }
        Returns: undefined
      }
      revoke_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      set_platform_setting: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      set_property_public_profile: {
        Args: { p_enabled: boolean; p_property_id: string }
        Returns: string
      }
      set_subscription_status: {
        Args: { p_status: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_conversation: {
        Args: { p_first_message?: string; p_ref_id: string; p_ref_type: string }
        Returns: string
      }
      terminate_contract: {
        Args: { p_contract_id: string; p_end_date?: string }
        Returns: undefined
      }
      update_listing_with_details: {
        Args: {
          p_amenities?: string[]
          p_listing: Json
          p_listing_id: string
          p_media?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
