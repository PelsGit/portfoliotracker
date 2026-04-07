import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ImportCsv from './pages/ImportCsv';
import Overview from './pages/Overview';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/import" element={<ImportCsv />} />
      </Route>
    </Routes>
  );
}
