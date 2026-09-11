/** Shared, non-government identity validation helpers. No UIDAI lookup is made. */
const multiplicationTable = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0],
] as const
const permutationTable = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,8,2,6,3,0,7,5,1],[4,2,6,1,7,5,9,3,8,0],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,1,9,5,2,3,8]] as const
export function normalizeDigits(value: string) { return value.replace(/\D/g, '') }
export function normalizeAadhaar(value: string) { return normalizeDigits(value).slice(0, 12) }
export function normalizeMobile(value: string) { const d = normalizeDigits(value); return d.length === 12 && d.startsWith('91') ? d.slice(2) : d.slice(0, 10) }
export function isVerhoeffValid(value: string) { const d = normalizeAadhaar(value); if (!/^\d{12}$/.test(d)) return false; let c = 0; for (const [i, x] of [...d].reverse().entries()) c = multiplicationTable[c][permutationTable[i % 8][Number(x)]]; return c === 0 }
export function getAadhaarValidation(value: string) { const normalized = normalizeAadhaar(value); const formatValid = /^\d{12}$/.test(normalized) && !/^(\d)\1{11}$/.test(normalized); return { normalized, formatValid, verhoeffValid: formatValid && isVerhoeffValid(normalized) } }
export function formatAadhaar(value: string) { return normalizeAadhaar(value).replace(/(\d{4})(?=\d)/g, '$1 ').trim() }
export function getMobileValidation(value: string) { const normalized = normalizeMobile(value); return { normalized, valid: /^[6-9]\d{9}$/.test(normalized) } }
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export function calculateVerificationStatus(i: { formatValid: boolean; verhoeffValid: boolean; mobileVerified: boolean; consent: boolean }): VerificationStatus { return i.formatValid && i.verhoeffValid && i.mobileVerified && i.consent ? 'verified' : 'pending' }
