export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert = Partial<Omit<Row, 'id' | 'created_at'>>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Farmer = { id: string; name: string; village: string; mobile_number: string; crop_name: string; quantity: number; quality_grade: string | null; harvest_date: string | null; verified: boolean; created_at: string }
export type Buyer = { id: string; buyer_name: string; organization_name: string; mobile_number: string; created_at: string }
export type Order = { id: string; buyer_id: string; crop_required: string; quantity_required: number; grade_required: string | null; delivery_date: string; delivery_location: string; status: string; created_at: string }
export type Commitment = { id: string; order_id: string; farmer_id: string; quantity_committed: number; commitment_status: string; created_at: string }
export type IdentityVerification = { id: string; user_id: string; user_type: 'farmer' | 'buyer'; aadhaar_number: string; aadhaar_last4: string; aadhaar_consent: boolean; mobile_number: string; mobile_verified: boolean; aadhaar_document_url: string | null; aadhaar_format_valid: boolean; verhoeff_valid: boolean; ocr_name: string | null; ocr_aadhaar: string | null; identity_confidence: number | null; verification_status: 'pending' | 'verified' | 'rejected'; verified_at: string | null; created_at: string; updated_at: string }
export type IdentityOtpChallenge = { id: string; verification_id: string; otp_hash: string; expires_at: string; attempts: number; consumed_at: string | null; created_at: string }
export type UserProfile = { id: string; role: 'farmer' | 'buyer' | 'admin'; full_name: string; mobile_number: string | null; village: string | null; district: string | null; state: string | null; fpo_name: string | null; organization_name: string | null; organization_type: string | null; verification_status: 'pending' | 'verified' | 'rejected'; onboarding_complete: boolean; last_login_at: string | null; last_logout_at: string | null; created_at: string; updated_at: string }
export type BuyerPurchaseRequest = { id: string; buyer_id: string; crop: string; quantity_kg: number; purpose: string | null; review_required: boolean; review_status: 'not_required' | 'pending' | 'approved' | 'rejected'; admin_note: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
export type AggregationBatch = { id: string; batch_code: string; fpo_name: string; crop: string; location: string; total_quantity_kg: number; grade_a_kg: number; grade_b_kg: number; quality_verified: boolean; created_by: string | null; created_at: string }
export type AuthActivity = { id: string; user_id: string | null; event_type: 'login' | 'logout' | 'signup' | 'onboarding_complete'; metadata: Json; created_at: string }
export type AggregationContribution = { id: string; batch_id: string; farmer_id: string | null; quantity_kg: number; created_at: string }

export type Database = { public: { Tables: {
  farmers: Table<Farmer>; buyers: Table<Buyer>; orders: Table<Order>; commitments: Table<Commitment>; identity_verifications: Table<IdentityVerification>; identity_otp_challenges: Table<IdentityOtpChallenge>; user_profiles: Table<UserProfile, Partial<UserProfile>>; auth_activity: Table<AuthActivity>; buyer_purchase_requests: Table<BuyerPurchaseRequest>; aggregation_batches: Table<AggregationBatch>; aggregation_contributions: Table<AggregationContribution>
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }
