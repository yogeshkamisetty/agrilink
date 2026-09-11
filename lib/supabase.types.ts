export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Insert = Omit<Row, 'id' | 'created_at'>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Farmer = { id: string; name: string; village: string; mobile_number: string; crop_name: string; quantity: number; quality_grade: string | null; harvest_date: string | null; created_at: string }
export type Buyer = { id: string; buyer_name: string; organization_name: string; mobile_number: string; created_at: string }
export type Order = { id: string; buyer_id: string; crop_required: string; quantity_required: number; delivery_date: string; delivery_location: string; status: string; created_at: string }
export type Commitment = { id: string; order_id: string; farmer_id: string; quantity_committed: number; created_at: string }

export type Database = { public: { Tables: {
  farmers: Table<Farmer>; buyers: Table<Buyer>; orders: Table<Order>; commitments: Table<Commitment>
} } }
