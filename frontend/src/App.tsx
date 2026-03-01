import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PayrollSheetsPage from './pages/PayrollSheetsPage'
import PayrollSheetDetailPage from './pages/PayrollSheetDetailPage'
import PayrollSheetCreatePage from './pages/PayrollSheetCreatePage'
import TeachersPage from './pages/TeachersPage'
import SubjectsPage from './pages/SubjectsPage'
import RatesPage from './pages/RatesPage'
import ApprovalPage from './pages/ApprovalPage'
import FinancePage from './pages/FinancePage'
import CitiesPage from './pages/CitiesPage'
import TransactionsPage from './pages/TransactionsPage'
import UserProfilesPage from './pages/UserProfilesPage'
import BranchesPage from './pages/BranchesPage'
import SettingsPage from './pages/SettingsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import NotificationsPage from './pages/NotificationsPage'
import AdminsPage from './pages/AdminsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="payroll-sheets" element={<PayrollSheetsPage />} />
          <Route path="payroll-sheets/new" element={<PayrollSheetCreatePage />} />
          <Route path="payroll-sheets/:id" element={<PayrollSheetDetailPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="rates" element={<RatesPage />} />
          <Route path="approval" element={<ApprovalPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="profiles" element={<UserProfilesPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
