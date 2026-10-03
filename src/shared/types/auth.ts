export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  contact_phone: string;
  contact_email?: string | null;
  contact_phone_verified_at?: string | null;
  is_seller: boolean;
  created_at: string;
  updated_at: string;
}
