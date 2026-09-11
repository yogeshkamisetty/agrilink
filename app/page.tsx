import { AICopilotPanel } from '@/components/ai-copilot-panel'
import { AgriLinkDashboard } from '@/components/agri-link-dashboard'
import { FarmerRegistration } from '@/components/farmer-registration'

export default function Page() {
  return <><AgriLinkDashboard /><div className="mx-auto max-w-[1500px] space-y-8 px-5 pb-10 sm:px-8 lg:pl-[21rem] lg:pr-10"><FarmerRegistration /><AICopilotPanel /></div></>
}
