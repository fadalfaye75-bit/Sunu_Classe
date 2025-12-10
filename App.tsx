
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Infos } from './pages/Infos';
import { Meet } from './pages/Meet';
import { DS } from './pages/DS';
import { Polls } from './pages/Polls';
import { AdminPanel } from './pages/AdminPanel';
import { Login } from './pages/Login';

const Main: React.FC = () => {
  const { user } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'infos': return <Infos />;
      case 'meet': return <Meet />;
      case 'ds': return <DS />;
      case 'polls': return <Polls />;
      case 'admin': return <AdminPanel />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}