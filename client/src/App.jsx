import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CharacterSetup from './pages/CharacterSetup.jsx';
import Home from './pages/Home.jsx';
import Character from './pages/Character.jsx';
import CharacterSkills from './pages/CharacterSkills.jsx';
import ChangePath from './pages/ChangePath.jsx';
import Report from './pages/Report.jsx';
import TrialList from './pages/TrialList.jsx';
import TrialDetail from './pages/TrialDetail.jsx';
import TrialRewards from './pages/TrialRewards.jsx';
import TrialCreate from './pages/TrialCreate.jsx';
import ApplyHost from './pages/ApplyHost.jsx';
import TrialTrade from './pages/TrialTrade.jsx';
import Lottery from './pages/Lottery.jsx';
import Backpack from './pages/Backpack.jsx';
import Ranking from './pages/Ranking.jsx';
import Admin from './pages/Admin.jsx';
import NavBar from './components/NavBar.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function CheckRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  const showNav = ['/home', '/character', '/trial', '/backpack', '/ranking'].some(p => location.pathname.startsWith(p));

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/character-setup" element={<Protected><CharacterSetup /></Protected>} />
        <Route path="/home" element={<Protected><Home /></Protected>} />
        <Route path="/character" element={<Protected><Character /></Protected>} />
        <Route path="/character/skills" element={<Protected><CharacterSkills /></Protected>} />
        <Route path="/change-path" element={<Protected><ChangePath /></Protected>} />
        <Route path="/report" element={<Protected><Report /></Protected>} />
        <Route path="/trial" element={<Protected><TrialList /></Protected>} />
        <Route path="/trial/create" element={<Protected><TrialCreate /></Protected>} />
        <Route path="/trial/:id" element={<Protected><TrialDetail /></Protected>} />
        <Route path="/trial/:id/rewards" element={<Protected><TrialRewards /></Protected>} />
        <Route path="/trial/:id/trade" element={<Protected><TrialTrade /></Protected>} />
        <Route path="/trial/apply-host" element={<Protected><ApplyHost /></Protected>} />
        <Route path="/lottery" element={<Protected><Lottery /></Protected>} />
        <Route path="/backpack" element={<Protected><Backpack /></Protected>} />
        <Route path="/ranking" element={<Protected><Ranking /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      {showNav && <NavBar />}
    </>
  );
}
