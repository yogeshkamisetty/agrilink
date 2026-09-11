export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert = Omit<Row, 'id' | 'created_at'>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Farmer = { id: string; name: string; village: string; mobile_number: string; crop_name: string; quantity: number; quality_grade: string | null; harvest_date: string | null; verified: boolean; created_at: string }
export type Buyer = { id: string; buyer_name: string; organization_name: string; mobile_number: string; created_at: string }
export type Order = { id: string; buyer_id: string; crop_required: string; quantity_required: number; grade_required: string | null; delivery_date: string; delivery_location: string; status: string; created_at: string }
export type Commitment = { id: string; order_id: string; farmer_id: string; quantity_committed: number; commitment_status: string; created_at: string }
export type IdentityVerification = { id: string; subject_type: 'farmer' | 'buyer'; subject_id: string; aadhaar_last4: string; status: string; consent_at: string; otp_sent_at: string | null; verified_at: string | null; created_at: string }

export type Database = { public: { Tables: {
  farmers: Table<Farmer>; buyers: Table<Buyer>; orders: Table<Order>; commitments: Table<Commitment>; identity_verifications: Table<IdentityVerification>
} } }
