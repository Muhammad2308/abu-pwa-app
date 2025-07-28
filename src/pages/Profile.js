import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import countries from '../utils/countries';

const Profile = () => {
  const { user, updateUser, logout, isAuthenticated } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profile_image') || '');
  const [imagePreview, setImagePreview] = useState(profileImage);
  const profileData = user || {};

  const { register, handleSubmit, reset, setValue, formState: { errors, isDirty, isSubmitting } } = useForm({
    defaultValues: {
      name: profileData.name || '',
      state: profileData.state || '',
      city: profileData.city || '',
      nationality: profileData.nationality || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      profile_image: profileImage || '',
    },
  });

  const onImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfileImage(ev.target.result);
        setImagePreview(ev.target.result);
        localStorage.setItem('profile_image', ev.target.result);
        setValue('profile_image', ev.target.result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data) => {
    // Save image path/data URL to backend
    updateUser && updateUser(data);
    setEditing(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Profile Management</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex flex-col items-center mb-4">
          <div className="relative w-24 h-24 mb-2">
            <img
              src={imagePreview || '/default-avatar.png'}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-gray-300"
            />
            {editing && (
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                style={{ width: '100%', height: '100%' }}
                onChange={onImageChange}
                tabIndex={-1}
              />
            )}
          </div>
          <input type="hidden" {...register('profile_image')} value={profileImage} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            {...register('name', { required: 'Name is required' })}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
            disabled={!editing}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input
              type="text"
              {...register('state', { required: 'State is required' })}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              disabled={!editing}
            />
            {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state.message}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">City (LGA)</label>
            <input
              type="text"
              {...register('city', { required: 'City/LGA is required' })}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              disabled={!editing}
            />
            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Country of Residence</label>
          <select
            {...register('nationality', { required: 'Country is required' })}
            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
            disabled={!editing}
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          {errors.nationality && <p className="text-xs text-red-600 mt-1">{errors.nationality.message}</p>}
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
                  setImagePreview(profileImage);
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