import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchUserProfile, 
  updateUserProfile, 
  addAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../../features/user/userSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const { profile, addresses, status, error } = useSelector((state) => state.user);

  // Local state for editing profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });

  // Local state for adding an address
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Fetch profile on mount
  useEffect(() => {
    if (!profile) {
      dispatch(fetchUserProfile());
    } else {
      setProfileForm({ name: profile.name || '', phone: profile.phone || '' });
    }
  }, [dispatch, profile]);

  // Profile Handlers
  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    dispatch(updateUserProfile(profileForm)); // Updates name and phone[cite: 1]
    setIsEditingProfile(false);
  };

  // Address Handlers
  const handleAddressChange = (e) => {
    setAddressForm({ ...addressForm, [e.target.name]: e.target.value });
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    dispatch(addAddress(addressForm)); // Posts new address to API[cite: 5]
    setIsAddingAddress(false);
    setAddressForm({ label: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">My Account</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* --- Profile Information Section --- */}
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Profile Information</h2>
          {!isEditingProfile && (
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email (Read Only)</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-50 shadow-sm sm:text-sm p-2 border text-gray-500"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium text-gray-900">{profile?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email Address</p>
              <p className="font-medium text-gray-900">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="font-medium text-gray-900">{profile?.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Account Role</p>
              <p className="font-medium text-gray-900 capitalize">{profile?.role}</p>
            </div>
          </div>
        )}
      </section>

      {/* --- Address Management Section --- */}
      <section className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Saved Addresses</h2>
          <button 
            onClick={() => setIsAddingAddress(!isAddingAddress)}
            className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900"
          >
            {isAddingAddress ? 'Cancel' : '+ Add Address'}
          </button>
        </div>

        {/* Add Address Form */}
        {isAddingAddress && (
          <form onSubmit={handleAddressSubmit} className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-800">New Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Label (e.g., Home, Work)</label>
                <input
                  type="text"
                  name="label"
                  value={addressForm.label}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Line 1</label>
                <input
                  type="text"
                  name="line1"
                  value={addressForm.line1}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={addressForm.city}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={addressForm.pincode}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Save Address
            </button>
          </form>
        )}

        {/* Address List */}
        {addresses?.length === 0 ? (
          <p className="text-gray-500 text-sm">No addresses saved yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr._id} className={`border rounded-lg p-4 relative ${addr.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                {addr.isDefault && (
                  <span className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    Default
                  </span>
                )}
                <h4 className="font-bold text-gray-800">{addr.label}</h4>
                <p className="text-gray-600 text-sm mt-1">{addr.line1}</p>
                {addr.line2 && <p className="text-gray-600 text-sm">{addr.line2}</p>}
                <p className="text-gray-600 text-sm">{addr.city}, {addr.state} - {addr.pincode}</p>
                
                <div className="mt-4 flex space-x-3">
                  {!addr.isDefault && (
                    <button 
                      onClick={() => dispatch(setDefaultAddress(addr._id))} // Triggers default address update[cite: 5]
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Set as Default
                    </button>
                  )}
                  <button 
                    onClick={() => dispatch(deleteAddress(addr._id))} // Triggers address deletion[cite: 5]
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;