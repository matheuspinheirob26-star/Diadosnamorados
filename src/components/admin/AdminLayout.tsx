import React, { useState } from 'react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { Menu, ShieldAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface AdminLayoutProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  children
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-luxury-black bg-gradient-luxury text-theme-muted flex">
      
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={onLogout} 
        />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Sidebar drawer container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-64 h-full z-10"
            >
              <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onCloseMobile={() => setMobileOpen(false)}
                onLogout={onLogout}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden h-16 bg-luxury-gray border-b border-theme-border-faint px-4 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-theme-muted hover:text-white p-2 focus:outline-none cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="text-center">
            <span className="font-serif text-md tracking-widest font-light text-gradient-gold uppercase block">
              Amour & Co.
            </span>
          </div>

          <div className="w-9 h-9 flex items-center justify-center text-rose-400">
            <ShieldAlert size={18} />
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>

    </div>
  );
};
