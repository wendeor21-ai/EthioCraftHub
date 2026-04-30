import { useState, useCallback } from 'react';
import Sidebar from '../common/Sidebar';

const DashboardLayout = ({ children, hideSidebar = false }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapsedChange = useCallback((val) => setCollapsed(val), []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!hideSidebar && (
        <Sidebar onCollapsedChange={handleCollapsedChange} />
      )}
      <main
        className={`flex-1 overflow-x-hidden min-w-0 transition-all duration-300
          ${!hideSidebar ? 'pt-16 lg:pt-0' : ''}
        `}
      >
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
