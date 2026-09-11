import { supabase } from './supabase'
import type { Buyer, Commitment, Farmer, Order } from './supabase.types'

export type FarmerInput = Omit<Farmer, 'id' | 'created_at'>
export type BuyerInput = Omit<Buyer, 'id' | 'created_at'>
export type OrderInput = Omit<Order, 'id' | 'created_at'>
export type CommitmentInput = Omit<Commitment, 'id' | 'created_at'>

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data as T
}

export const createFarmer = (input: FarmerInput) => unwrap(supabase.from('farmers').insert(input).select().single())
export const getFarmers = () => unwrap(supabase.from('farmers').select('*').order('created_at', { ascending: false }))
export const createBuyer = (input: BuyerInput) => unwrap(supabase.from('buyers').insert(input).select().single())
export const getBuyers = () => unwrap(supabase.from('buyers').select('*').order('created_at', { ascending: false }))
export const createOrder = (input: OrderInput) => unwrap(supabase.from('orders').insert(input).select().single())
export const getOrders = () => unwrap(supabase.from('orders').select('*').order('created_at', { ascending: false }))
export const createCommitment = (input: CommitmentInput) => unwrap(supabase.from('commitments').insert(input).select().single())
