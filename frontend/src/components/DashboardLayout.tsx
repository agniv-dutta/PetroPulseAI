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
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-h-screen lg:pl-56">
        <SystemStatusBar />

        <main className="flex-1 p-3 md:p-4 lg:p-5 max-w-[1520px] w-full mx-auto">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
};
