import { AICopilotPanel } from '@/components/ai-copilot-panel'
import { AgriLinkDashboard } from '@/components/agri-link-dashboard'

export default function Page() {
  return <><AgriLinkDashboard /><div className="mx-auto max-w-[1500px] px-5 pb-10 sm:px-8 lg:pl-[21rem] lg:pr-10"><AICopilotPanel /></div></>
}
