import React, { useState, useCallback } from 'react';
import type { User, Screen, Application, Stage, Customer } from './types';
import { APPLICATIONS } from './data/mock';

import Login from './screens/Login';
import CustomerOverview from './screens/customer/Overview';
import Pipeline from './screens/customer/Pipeline';
import Candidates from './screens/customer/Candidates';
import Jobs from './screens/customer/Jobs';
import CustomerSettings from './screens/customer/Settings';
import AdminOverview from './screens/admin/AdminOverview';
import AdminCustomers from './screens/admin/AdminCustomers';
import AdminReview from './screens/admin/AdminReview';
import AdminAdmins from './screens/admin/AdminAdmins';
import AdminInbox from './screens/admin/AdminInbox';
import AdminAudit from './screens/admin/AdminAudit';
import AdminSettings from './screens/admin/AdminSettings';
import RequestAccess from './screens/public/RequestAccess';
import PublicJob from './screens/public/PublicJob';
import Sidebar from './components/Sidebar';
import ContextBanner from './components/ContextBanner';
import Toast from './components/Toast';

interface ToastData {
  message: string;
  onUndo?: () => void;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('login');
  const [adminContext, setAdminContext] = useState<Customer | null>(null);
  const [applications, setApplications] = useState<Application[]>(APPLICATIONS);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((msg: string, onUndo?: () => void) => {
    setToast({ message: msg, onUndo });
    if (!onUndo) setTimeout(() => setToast(null), 3500);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'customer') {
      setScreen('customer-overview');
    } else {
      setScreen('admin-overview');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAdminContext(null);
    setScreen('login');
  };

  const handleEnterCustomerContext = (customer: Customer) => {
    setAdminContext(customer);
    setScreen('customer-overview');
  };

  const handleExitCustomerContext = () => {
    setAdminContext(null);
    setScreen('admin-customers');
  };

  const handleStageChange = useCallback((appId: string, newStage: Stage, candidateName: string) => {
    const prev = applications.find(a => a.id === appId);
    const oldStage = prev?.stage;

    setApplications(apps => apps.map(a =>
      a.id === appId
        ? { ...a, stage: newStage, lastUpdated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), activities: [{ id: Date.now().toString(), date: 'Just now', user: currentUser?.name ?? 'You', action: `Moved to ${newStage}` }, ...(a.activities ?? [])] }
        : a
    ));

    showToast(`${candidateName} moved to ${newStage}`, () => {
      if (oldStage) {
        setApplications(apps => apps.map(a => a.id === appId ? { ...a, stage: oldStage } : a));
        showToast(`Undone — ${candidateName} returned to ${oldStage}`);
      }
    });
  }, [applications, currentUser, showToast]);

  // ── Public screens (no auth) ──────────────────────────────────────────────
  if (screen === 'public-request-access') {
    return <RequestAccess onBack={() => setScreen('login')} />;
  }
  if (screen === 'public-job-page') {
    return <PublicJob onBack={() => setScreen('login')} />;
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} onRequestAccess={() => setScreen('public-request-access')} />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  // ── Effective user role for navigation ────────────────────────────────────
  // When admin is viewing customer context, show customer navigation
  const effectiveRole = adminContext ? 'customer' : currentUser.role;
  const navUser: User = adminContext
    ? { ...currentUser, role: 'customer' }
    : currentUser;

  const inboxCount = 2;
  const reviewCount = 3;

  const renderScreen = () => {
    // Customer screens (also used when admin enters customer context)
    if (effectiveRole === 'customer') {
      switch (screen) {
        case 'customer-overview': return <CustomerOverview onNavigate={setScreen} />;
        case 'customer-pipeline': return <Pipeline applications={applications} onStageChange={handleStageChange} />;
        case 'customer-candidates': return <Candidates />;
        case 'customer-jobs': return <Jobs />;
        case 'customer-settings': return <CustomerSettings user={currentUser} />;
        default: return <CustomerOverview onNavigate={setScreen} />;
      }
    }

    // Admin / Platform Owner screens
    switch (screen) {
      case 'admin-overview': return <AdminOverview user={currentUser} onNavigate={setScreen} />;
      case 'admin-customers': return <AdminCustomers onEnterContext={handleEnterCustomerContext} userId={currentUser.id} isPlatformOwner={currentUser.role === 'platform_owner'} />;
      case 'admin-review': return <AdminReview />;
      case 'admin-admins': return <AdminAdmins />;
      case 'admin-inbox': return <AdminInbox />;
      case 'admin-audit': return <AdminAudit />;
      case 'admin-settings': return <AdminSettings user={currentUser} />;
      default: return <AdminOverview user={currentUser} onNavigate={setScreen} />;
    }
  };

  // Determine correct screen after context switch
  const handleNavigate = (s: Screen) => {
    // If in customer context and navigating to admin screens, exit context
    if (adminContext && s.startsWith('admin-')) {
      handleExitCustomerContext();
      return;
    }
    setScreen(s);
  };

  return (
    <div className="flex min-h-screen bg-workspace">
      <Sidebar
        user={navUser}
        screen={screen}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        inboxCount={inboxCount}
        reviewCount={reviewCount}
      />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Context banner when admin is viewing customer workspace */}
        {adminContext && (
          <ContextBanner customer={adminContext} onExit={handleExitCustomerContext} />
        )}

        {renderScreen()}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
