import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import PincodeInput from '../../components/location/PincodeInput';
import useGeolocation from '../../hooks/useGeolocation';
import useToast from '../../hooks/useToast';
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserLocation,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from '../../features/user/userSlice';

const emptyAddressForm = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return err.message || fallback;
};

const Profile = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { profile, addresses, status, error } = useSelector((state) => state.user);
  const { location, getLocation, loading: geoLoading, error: geoError } = useGeolocation();

  const [personalForm, setPersonalForm] = useState({ name: '', phone: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setPersonalForm({ name: profile.name || '', phone: profile.phone || '' });
    }
  }, [profile]);

  useEffect(() => {
    if (error) {
      toast.error(getErrorMessage(error));
    }
  }, [error, toast]);

  // ---------- Personal info ----------

  const handlePersonalChange = (field) => (e) =>
    setPersonalForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      await dispatch(updateUserProfile(personalForm)).unwrap();
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update profile.'));
    } finally {
      setSavingPersonal(false);
    }
  };

  // ---------- Location ----------

  const handleUseMyLocation = async () => {
    try {
      const coords = await getLocation();
      if (coords) {
        await dispatch(updateUserLocation({ lat: coords.lat, lng: coords.lng })).unwrap();
        toast.success('Location updated from device GPS.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update location.'));
    }
  };

  const handlePincodeConfirm = async (data) => {
    const pincodeVal = typeof data === 'string' ? data : data?.pincode;
    const city = data?.city;
    const lat = data?.lat;
    const lng = data?.lng;
    try {
      await dispatch(updateUserLocation({ lat, lng, pincode: pincodeVal, city })).unwrap();
      toast.success('Pincode location updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update location.'));
    }
  };

  // ---------- Addresses ----------

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setAddressModalOpen(true);
  };

  const openEditAddress = (address) => {
    setEditingAddressId(address._id);
    setAddressForm({
      label: address.label || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      isDefault: !!address.isDefault,
    });
    setAddressModalOpen(true);
  };

  const closeAddressModal = useCallback(() => {
    setAddressModalOpen(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
  }, []);

  const handleAddressFieldChange = (field) => (e) => {
    const value = field === 'isDefault' ? e.target.checked : e.target.value;
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      if (editingAddressId) {
        await dispatch(
          updateAddress({ addressId: editingAddressId, addressData: addressForm })
        ).unwrap();
        toast.success('Address updated successfully.');
      } else {
        const payload = {
          ...addressForm,
          coordinates:
            location?.lat && location?.lng ? [location.lng, location.lat] : undefined,
        };
        await dispatch(addAddress(payload)).unwrap();
        toast.success('Address added successfully.');
      }
      closeAddressModal();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this address.'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await dispatch(setDefaultAddress(id)).unwrap();
      toast.success('Default address updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not set default address.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success('Address removed.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove this address.'));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const initials = (profile?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  if (status === 'loading' && !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-36 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasCoordinates =
    Array.isArray(profile?.location?.coordinates) &&
    profile.location.coordinates.length === 2 &&
    profile.location.coordinates.some((c) => c !== 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header Hero Card */}
      <div className="relative overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm">
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 min-w-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold ring-4 ring-white shadow-md shrink-0">
              {initials || '👤'}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {profile?.name || 'Your Account'}
                </h1>
                <Badge tone="neutral" className="capitalize font-semibold px-3 py-1">
                  {profile?.role || 'User'}
                </Badge>
                {profile?.isVerified ? (
                  <Badge tone="success" className="px-3 py-1">✓ Verified</Badge>
                ) : (
                  <Badge tone="warning" className="px-3 py-1">Pending Verification</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 truncate">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {profile?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto bg-gray-50 p-2.5 rounded-xl border border-gray-100 shrink-0">
            <div className="px-3 text-center border-r border-gray-200">
              <span className="block text-xs text-gray-500 uppercase tracking-wider font-semibold">Addresses</span>
              <span className="text-lg font-bold text-gray-900">{addresses?.length || 0}</span>
            </div>
            <div className="px-3 text-center">
              <span className="block text-xs text-gray-500 uppercase tracking-wider font-semibold">Pincode</span>
              <span className="text-lg font-bold text-indigo-600">{profile?.pincode || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Info & Delivery Location */}
        <div className="lg:col-span-1 space-y-8">
          {/* Personal Info */}
          <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Personal Info</h2>
            </div>

            <form onSubmit={handlePersonalSubmit} className="space-y-4">
              <Input
                id="profile-name"
                label="Full Name"
                value={personalForm.name}
                onChange={handlePersonalChange('name')}
                required
              />
              <Input
                id="profile-phone"
                label="Phone Number"
                type="tel"
                placeholder="Enter phone number"
                value={personalForm.phone}
                onChange={handlePersonalChange('phone')}
              />
              <Input
                id="profile-email"
                label="Email Address"
                value={profile?.email || ''}
                disabled
              />
              <p className="text-xs text-gray-400 -mt-2">Email address is managed by your account login.</p>

              <div className="pt-2">
                <Button type="submit" loading={savingPersonal} className="w-full shadow-sm">
                  Save Personal Info
                </Button>
              </div>
            </form>
          </section>

          {/* Delivery Location */}
          <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delivery Location</h2>
                <p className="text-xs text-gray-500">Shows products near your area first</p>
              </div>
            </div>

            {hasCoordinates || profile?.pincode ? (
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-100/80 rounded-xl p-4 mb-4">
                {profile?.pincode && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Active Pincode</span>
                    <span className="text-base font-bold text-indigo-950">{profile.pincode} {profile?.city ? `(${profile.city})` : ''}</span>
                  </div>
                )}
                {hasCoordinates && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 pt-1 border-t border-indigo-100/60">
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span>GPS: {profile.location.coordinates[1].toFixed(4)}, {profile.location.coordinates[0].toFixed(4)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mb-4 text-xs text-amber-800 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>No delivery location set. Set your pincode below to view nearby products.</span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleUseMyLocation}
                loading={geoLoading}
                className="w-full flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Use Device Geolocation
              </Button>
              <PincodeInput onConfirm={handlePincodeConfirm} />
            </div>

            {geoError && (
              <p className="mt-3 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {geoError}
              </p>
            )}
          </section>
        </div>

        {/* Right Column: Saved Addresses */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Saved Addresses</h2>
                  <p className="text-xs text-gray-500">Manage your shipping destinations</p>
                </div>
              </div>
              <Button type="button" size="sm" onClick={openAddAddress} className="flex items-center gap-1.5 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Address
              </Button>
            </div>

            {(!addresses || addresses.length === 0) ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No saved addresses yet</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                  Add a delivery address to complete checkout faster on your next order.
                </p>
                <Button type="button" variant="secondary" onClick={openAddAddress} className="inline-flex items-center gap-1">
                  + Add Address
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div
                    key={address._id}
                    className={`border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 ${
                      address.isDefault
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {address.label}
                        </span>
                        {address.isDefault && (
                          <Badge tone="success" className="px-2.5 py-0.5 text-xs font-semibold">Default</Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-0.5 leading-relaxed pt-1">
                        <p className="font-medium text-gray-800">{address.line1}</p>
                        {address.line2 && <p className="text-gray-500">{address.line2}</p>}
                        <p className="text-gray-700">
                          {address.city}{address.state ? `, ${address.state}` : ''}
                        </p>
                        <p className="font-semibold text-indigo-700 pt-1 flex items-center gap-1">
                          <span className="text-xs text-gray-400 font-normal">Pincode:</span> {address.pincode}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                      {!address.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address._id)}
                          className="text-xs font-medium text-gray-500 hover:text-indigo-600 hover:underline transition-colors"
                        >
                          Set as default
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Primary shipping</span>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`Edit ${address.label} address`}
                          onClick={() => openEditAddress(address)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${address.label} address`}
                          onClick={() => setConfirmDeleteId(address._id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <Modal
        open={addressModalOpen}
        onClose={closeAddressModal}
        title={editingAddressId ? 'Edit Address' : 'Add New Address'}
      >
        <form onSubmit={handleAddressSubmit} className="space-y-4 pt-1">
          <Input
            id="address-label"
            label="Address Label"
            placeholder="e.g. Home, Work, Parents"
            value={addressForm.label}
            onChange={handleAddressFieldChange('label')}
            required
          />

          <Input
            id="address-line1"
            label="Street Address / Line 1"
            placeholder="House/Flat No., Street, Area"
            value={addressForm.line1}
            onChange={handleAddressFieldChange('line1')}
            required
          />

          <Input
            id="address-line2"
            label="Address Line 2 (Optional)"
            placeholder="Landmark, Suite, Unit"
            value={addressForm.line2}
            onChange={handleAddressFieldChange('line2')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="address-city"
              label="City"
              placeholder="e.g. Dhaka"
              value={addressForm.city}
              onChange={handleAddressFieldChange('city')}
              required
            />
            <Input
              id="address-state"
              label="State / Division"
              placeholder="e.g. Dhaka Division"
              value={addressForm.state}
              onChange={handleAddressFieldChange('state')}
            />
          </div>

          <Input
            id="address-pincode"
            label="Pincode / Zipcode"
            placeholder="e.g. 1205"
            value={addressForm.pincode}
            onChange={handleAddressFieldChange('pincode')}
            required
          />

          <div className="pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={handleAddressFieldChange('isDefault')}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Set as default shipping address</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={closeAddressModal}>
              Cancel
            </Button>
            <Button type="submit" loading={savingAddress} className="shadow-sm">
              {editingAddressId ? 'Update Address' : 'Save Address'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Address"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this address? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => handleDelete(confirmDeleteId)}>
              Delete Address
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;