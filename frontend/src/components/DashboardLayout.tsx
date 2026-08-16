import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { SystemStatusBar } from './SystemStatusBar';
import { Breadcrumbs } from './Breadcrumbs';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary font-sans flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Top Status Bar */}
        <SystemStatusBar />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
};
