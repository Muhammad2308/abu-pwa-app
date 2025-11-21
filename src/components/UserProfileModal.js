import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaUser, FaLock, FaEnvelope, FaTimes, FaSpinner, FaCamera, FaSave, FaPhone, FaMapMarkerAlt, FaCity } from 'react-icons/fa';
import api, { donorsAPI, donorSessionsAPI } from '../services/api';

const UserProfileModal = ({ isOpen, onClose, onUpdate }) => {
  const { user, username, sessionId, updateDonor, checkSession } = useAuth();
  const [formData, setFormData] = useState({
    // Donor fields
    name: '',
    surname: '',
    other_name: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    city: '',
    profile_image: null,
    profile_image_preview: '',
    // Donor session fields
    username: '',
    password: '',
    password_confirmation: '',
    current_password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' or 'account'

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        surname: user.surname || '',
        other_name: user.other_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        state: user.state || '',
        city: user.city || '',
        profile_image: null,
        profile_image_preview: user.profile_image ? (user.profile_image.startsWith('http') ? user.profile_image : `${api.defaults.baseURL}/storage/${user.profile_image}`) : '',
        username: username || '',
        password: '',
        password_confirmation: '',
        current_password: '',
      });
      setErrors({});
    }
  }, [isOpen, user, username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          profile_image: file,
          profile_image_preview: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors = {};

    // Validate donor fields
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'First name is required';
    }
    if (!formData.surname || !formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must be in international format (e.g., +2348012345678)';
    }
    if (!formData.address || !formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.state || !formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.city || !formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Validate account fields if username or password is provided
    if (formData.username && formData.username.trim() && formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password && formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare donor update data - ensure all required fields are present
      const donorUpdateData = {
        name: (formData.name || '').trim(),
        surname: (formData.surname || '').trim(),
        other_name: (formData.other_name || '').trim() || null,
        email: (formData.email || '').trim(),
        phone: (formData.phone || '').trim(),
        address: (formData.address || '').trim(),
        state: (formData.state || '').trim(),
        city: (formData.city || '').trim(),
      };

      // If profile image is selected, we'll need to upload it
      // For now, we'll send it as base64 or handle it separately
      // The backend should handle the image upload
      
      // Update donor
      console.log('UserProfileModal: Updating donor with data:', donorUpdateData);
      const donorResult = await updateDonor(user.id, donorUpdateData);
      
      if (!donorResult.success) {
        // Handle validation errors - map them to specific fields
        if (donorResult.errors) {
          const fieldErrors = {};
          Object.keys(donorResult.errors).forEach(field => {
            const messages = donorResult.errors[field];
            fieldErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ submit: donorResult.message || 'Failed to update profile' });
        }
        toast.error(donorResult.message || 'Failed to update profile');
        setIsSubmitting(false);
        return;
      }

      // Handle profile image upload if selected
      if (formData.profile_image) {
        try {
          console.log('Uploading profile image for donor ID:', user.id);
          console.log('Image file:', formData.profile_image);
          console.log('Image file name:', formData.profile_image.name);
          console.log('Image file size:', formData.profile_image.size);
          console.log('Image file type:', formData.profile_image.type);
          
          const imageResponse = await donorsAPI.uploadProfileImage(user.id, formData.profile_image);
          console.log('Profile image upload response:', imageResponse);
          console.log('Profile image upload response data:', imageResponse.data);
          
          // The backend should return the updated donor object with profile_image
          // Try to extract it from the response
          const updatedDonor = imageResponse.data?.data?.donor || imageResponse.data?.donor || imageResponse.data?.data;
          if (updatedDonor) {
            console.log('Updated donor from image upload:', updatedDonor);
            console.log('Updated donor profile_image:', updatedDonor.profile_image);
            
            if (!updatedDonor.profile_image) {
              console.warn('WARNING: Backend did not return profile_image in response!');
              console.warn('This means the backend endpoint is not updating the profile_image column in the database.');
              toast.error('Image uploaded but profile_image not updated in database. Please check backend implementation.');
            }
          } else {
            console.warn('WARNING: Backend did not return donor object in response!');
            console.warn('Response structure:', imageResponse.data);
          }
          
          // Refresh session to get latest user data including the new profile_image
          // This ensures the home page displays the updated image
          if (checkSession) {
            await checkSession();
            // Wait a bit for state to update
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          toast.success('Profile image uploaded successfully');
        } catch (imageError) {
          console.error('Profile image upload error:', imageError);
          console.error('Error response:', imageError.response);
          console.error('Error response data:', imageError.response?.data);
          console.error('Error status:', imageError.response?.status);
          
          // Show more detailed error message
          const errorMessage = imageError.response?.data?.message 
            || imageError.message 
            || 'Failed to upload profile image';
          toast.error(`Profile updated but image upload failed: ${errorMessage}`);
        }
      }

      // Update username if changed
      if (formData.username.trim() && formData.username !== username && sessionId) {
        try {
          await donorSessionsAPI.updateUsername(sessionId, formData.username.trim());
          toast.success('Username updated successfully');
        } catch (usernameError) {
          console.error('Username update error:', usernameError);
          const errorMsg = usernameError.response?.data?.message || 'Failed to update username';
          toast.error(errorMsg);
        }
      }

      // Update password if provided
      if (formData.password && formData.password.trim() && sessionId) {
        // Validate current password is provided
        if (!formData.current_password || !formData.current_password.trim()) {
          toast.error('Current password is required to change password');
          setErrors({ current_password: 'Current password is required' });
          setIsSubmitting(false);
          return;
        }

        try {
          await donorSessionsAPI.updatePassword(sessionId, {
            current_password: formData.current_password,
            new_password: formData.password,
            new_password_confirmation: formData.password_confirmation,
          });
          toast.success('Password updated successfully');
          // Clear password fields after successful update
          setFormData(prev => ({
            ...prev,
            password: '',
            password_confirmation: '',
            current_password: '',
          }));
        } catch (passwordError) {
          console.error('Password update error:', passwordError);
          const errorMsg = passwordError.response?.data?.message || 'Failed to update password';
          toast.error(errorMsg);
          setErrors({ password: errorMsg });
        }
      }

      toast.success('Profile updated successfully!');
      
      // Call onUpdate callback to refresh user data (including profile image)
      if (onUpdate) {
        await onUpdate();
      }
      
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('An unexpected error occurred');
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveSection('profile')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeSection === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Personal Information
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('account')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeSection === 'account'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Account Settings
            </button>
          </div>

          {/* Profile Image Section */}
          {activeSection === 'profile' && (
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-100 bg-gray-100 flex items-center justify-center">
                  {formData.profile_image_preview ? (
                    <img
                      src={formData.profile_image_preview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUser className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-3 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                  <FaCamera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Click camera icon to upload profile picture</p>
            </div>
          )}

          {/* Personal Information Section */}
          {activeSection === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter first name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Surname *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.surname ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter surname"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.surname && (
                    <p className="mt-1 text-sm text-red-600">{errors.surname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Other Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="other_name"
                      value={formData.other_name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter other name (optional)"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+2348012345678"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be in international format (e.g., +2348012345678)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none top-3">
                    <FaMapMarkerAlt className="text-gray-400" />
                  </div>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your address"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaMapMarkerAlt className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter state"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCity className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter city"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Settings Section */}
          {activeSection === 'account' && (
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter new username"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to keep current username
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.current_password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter current password (required to change password)"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.current_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Required if you want to change your password
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter new password (leave blank to keep current)"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                )}
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;

