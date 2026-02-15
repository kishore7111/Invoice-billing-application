import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const handleAddSampleNotification = () => {
    addNotification(
      'info',
      'New Invoice Created',
      'Invoice #1234 has been created successfully',
      'invoice',
      '1234'
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome back, {user?.name}!</h2>
        <p className="text-gray-600">
          {user?.role === 'admin' 
            ? 'You have administrator access to all features.' 
            : 'You have employee access to the system.'}
        </p>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              className="bg-indigo-100 text-indigo-700 p-4 rounded-lg hover:bg-indigo-200 transition-colors"
              onClick={handleAddSampleNotification}
            >
              Create New Invoice
            </button>
            <button className="bg-green-100 text-green-700 p-4 rounded-lg hover:bg-green-200 transition-colors">
              View Reports
            </button>
            <button className="bg-blue-100 text-blue-700 p-4 rounded-lg hover:bg-blue-200 transition-colors">
              Manage Clients
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
