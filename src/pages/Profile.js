import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

const dummyUser = {
  first_name: 'Amina',
  last_name: 'Bello',
  email: 'amina.bello@email.com',
  phone: '+2348012345678',
  graduation_year: '2018',
  faculty: 'Engineering',
  department: 'Electrical Engineering',
  donor_type: 'Alumni',
};

const Profile = () => {
  const { user, updateUser, logout, isAuthenticated } = useAuth();
  const [editing, setEditing] = useState(false);
  const profileData = user || dummyUser;

  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm({
    defaultValues: profileData,
  });

  const onSubmit = (data) => {
    // In a real app, send to backend here
    updateUser && updateUser(data);
    setEditing(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Profile Management</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              {...register('first_name', { required: 'First name is required' })}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              disabled={!editing}
            />
            {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              {...register('last_name', { required: 'Last name is required' })}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              disabled={!editing}
            />
            {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register('email', { required: 'Email is required' })}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
            disabled={!editing}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            {...register('phone', { required: 'Phone is required' })}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
            disabled={!editing}
          />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Graduation Year</label>
            <input
              type="text"
              {...register('graduation_year', { required: 'Graduation year is required' })}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              disabled={!editing}
            />
            {errors.graduation_year && <p className="text-xs text-red-600 mt-1">{errors.graduation_year.message}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Faculty</label>
            <input
              type="text"
              {...register('faculty', { required: 'Faculty is required' })}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              disabled={!editing}
            />
            {errors.faculty && <p className="text-xs text-red-600 mt-1">{errors.faculty.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <input
            type="text"
            {...register('department', { required: 'Department is required' })}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
            disabled={!editing}
          />
          {errors.department && <p className="text-xs text-red-600 mt-1">{errors.department.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Donor Type</label>
          <input
            type="text"
            {...register('donor_type', { required: 'Donor type is required' })}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
            disabled={!editing}
          />
          {errors.donor_type && <p className="text-xs text-red-600 mt-1">{errors.donor_type.message}</p>}
        </div>
        <div className="flex gap-2 mt-4">
          {!editing ? (
            <button
              type="button"
              className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition font-semibold"
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                type="submit"
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition font-semibold"
                disabled={isSubmitting || !isDirty}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-semibold"
                onClick={() => {
                  reset(profileData);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
      {isAuthenticated && (
        <button
          onClick={logout}
          className="mt-6 w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      )}
    </div>
  );
};

export default Profile; 