import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import RequireAuth from './components/RequireAuth'
import AccountPage from './pages/AccountPage'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import LandingPage from './pages/LandingPage'
import MoonPage from './pages/MoonPage'
import NotFound from './pages/NotFound'
import ReportPage from './pages/ReportPage'
import ResultsPage from './pages/ResultsPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import SkyPage from './pages/SkyPage'
import UploadPage from './pages/UploadPage'

export default function App() {
  return (
    <Routes>
      {/* Public: anyone can see these */}
      <Route element={<PublicLayout />}>
        <Route path="welcome" element={<LandingPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="signup" element={<SignUpPage />} />
      </Route>

      {/* Everything else needs a signed-in user (the gate sends others to /welcome) */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<UploadPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="moon" element={<MoonPage />} />
        <Route path="sky" element={<SkyPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}