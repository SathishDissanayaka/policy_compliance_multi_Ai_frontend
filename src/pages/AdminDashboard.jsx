import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Users, ShieldAlert } from 'lucide-react';
import { getToken } from "../lib/auth";
import supabase from '../utils/client';

const AdminDashboard = ({ role }) => {
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    admin_id: '',
    role: 'employee',
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const getAdminId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setNewUser(prev => ({ ...prev, admin_id: user.id }));
      }
    };
    getAdminId();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {

      console.log("admin id:", newUser.admin_id);
      const response = await fetch('http://127.0.0.1:5000/user/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Employee account created successfully!' });
        setNewUser({
          email: '',
          password: '',
          role: 'employee',
          admin_id: newUser.admin_id
        });
      } else {
        setStatus({ type: 'error', message: data.message || 'Failed to create employee account' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Error creating employee account' });
      console.error('Create user error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not admin, show access denied message
  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">You need to be an admin to access this page</p>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center justify-center mx-auto text-purple-600 hover:text-purple-700 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Chat
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Create and manage employee accounts</p>
        </div>

        {/* Create User Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Create Employee Account</h2>
              <p className="text-gray-500">Add new employees to the system</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Creating Account...
                </span>
              ) : (
                'Create Employee Account'
              )}
            </button>
          </form>

          {/* Status Message */}
          {status.message && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                status.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;