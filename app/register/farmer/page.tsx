import { FarmerVerificationWizard } from '@/components/farmer-verification-wizard'

export const metadata = {
  title: 'Farmer Registration & Verification · AgriLink SIH Prototype',
  description: 'Smart India Hackathon (SIH) Farmer Registration, UIDAI Identity, AgriStack Verification, and Assisted Verification Workflow.',
}

export default function FarmerRegisterPage() {
  return <FarmerVerificationWizard />
}
