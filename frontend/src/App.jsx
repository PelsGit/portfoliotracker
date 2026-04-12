import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Breakdown from './pages/Breakdown';
import Calendar from './pages/Calendar';
import Holdings from './pages/Holdings';
import ImportCsv from './pages/ImportCsv';
import Overview from './pages/Overview';
import Performance from './pages/Performance';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/holdings" element={<Holdings />} />
        <Route path="/breakdown" element={<Breakdown />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/import" element={<ImportCsv />} />
      </Route>
    </Routes>
  );
}
