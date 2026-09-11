import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/layout/DashboardLayout'
import { MasterDataProvider } from '../context/MasterDataContext'
import { BranchProvider } from '../context/BranchContext'
import { StudentProvider } from '../context/StudentContext'
import { StaffProvider } from '../context/StaffContext'
import { AcademicProvider } from '../context/AcademicContext'
import { ParentProvider } from '../context/ParentContext'
import { AttendanceProvider } from '../context/AttendanceContext'
import { FinanceProvider } from '../context/FinanceContext'
import { HomeworkProvider } from '../context/HomeworkContext'
import { AnnouncementProvider } from '../context/AnnouncementContext'
import { SubscriptionProvider } from '../context/SubscriptionContext'
import { getDashboardConfig } from '../config/dashboardConfig'
import { getSidebarNav } from '../config/sidebarNav'

export default function DashboardPage() {
  const { userRole, userBranchId, session } = useAuth()
  const config = getDashboardConfig(userRole)
  const sidebarNav = getSidebarNav(userRole)

  return (
    <MasterDataProvider key={`${session?.user?.id}:${userRole}:${userBranchId}`}><BranchProvider>
        <StudentProvider>
          <ParentProvider>
            <AcademicProvider>
              <AttendanceProvider>
                <FinanceProvider>
                  <HomeworkProvider>
                    <AnnouncementProvider>
                      <SubscriptionProvider>
                        <StaffProvider>
                          <DashboardLayout config={config} sidebarNav={sidebarNav} />
                        </StaffProvider>
                      </SubscriptionProvider>
                    </AnnouncementProvider>
                  </HomeworkProvider>
                </FinanceProvider>
              </AttendanceProvider>
            </AcademicProvider>
          </ParentProvider>
        </StudentProvider>
    </BranchProvider></MasterDataProvider>
  )
}
