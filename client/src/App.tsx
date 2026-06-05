import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from './context/ConfigContext';
import Layout from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ConfigPage } from './pages/ConfigPage';

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Route>
        </Routes>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export { App };
