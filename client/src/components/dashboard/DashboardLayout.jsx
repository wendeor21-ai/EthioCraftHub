import { useState, useCallback } from 'react';
import Sidebar from '../common/Sidebar';

const DashboardLayout = ({ children, hideSidebar = false }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapsedChange = useCallback((val) => setCollapsed(val), []);

  return (
    <div className="flex h-screen max-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {!hideSidebar && (
        <Sidebar onCollapsedChange={handleCollapsedChange} />
      )}
      <main
        className={`flex-1 h-full overflow-y-auto overflow-x-hidden min-w-0 transition-all duration-300 overscroll-contain scroll-smooth
          ${!hideSidebar ? 'pt-14 lg:pt-0' : ''}
        `}
      >
        <div className="pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
