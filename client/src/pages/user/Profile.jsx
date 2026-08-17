import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import PincodeInput from '../../components/location/PincodeInput';
import useGeolocation from '../../hooks/useGeolocation';
import useToast from '../../hooks/useToast';
import {
  fetchProfile,
  updateProfile,
  updateLocation,
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

const Profile = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { profile, addresses, status, error } = useSelector((state) => state.user);
  const { coords, requestLocation, loading: geoLoading, error: geoError } = useGeolocation();

  const [personalForm, setPersonalForm] = useState({ name: '', phone: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setPersonalForm({ name: profile.name || '', phone: profile.phone || '' });
    }
  }, [profile]);

  useEffect(() => {
    if (error) toast.error(error.message || 'Something went wrong. Please try again.');
  }, [error, toast]);

  // ---------- Personal info ----------

  const handlePersonalChange = (field) => (e) =>
    setPersonalForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      await dispatch(updateProfile(personalForm)).unwrap();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err?.message || 'Could not update profile.');
    } finally {
      setSavingPersonal(false);
    }
  };

  // ---------- Location ----------

  const handleUseMyLocation = () => requestLocation();

  useEffect(() => {
    if (coords) {
      dispatch(updateLocation({ lat: coords.lat, lng: coords.lng }))
        .unwrap()
        .then(() => toast.success('Location updated from your device.'))
        .catch((err) => toast.error(err?.message || 'Could not update location.'));
    }
  }, [coords, dispatch, toast]);

  const handlePincodeConfirm = async ({ pincode, city, lat, lng }) => {
    try {
      await dispatch(updateLocation({ lat, lng, pincode, city })).unwrap();
      toast.success('Location updated.');
    } catch (err) {
      toast.error(err?.message || 'Could not update location.');
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

  const closeAddressModal = () => {
    setAddressModalOpen(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
  };

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
          updateAddress({ id: editingAddressId, ...addressForm })
        ).unwrap();
        toast.success('Address updated.');
      } else {
        const payload = {
          ...addressForm,
          coordinates: coords ? [coords.lng, coords.lat] : undefined,
        };
        await dispatch(addAddress(payload)).unwrap();
        toast.success('Address added.');
      }
      closeAddressModal();
    } catch (err) {
      toast.error(err?.message || 'Could not save this address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await dispatch(setDefaultAddress(id)).unwrap();
      toast.success('Default address updated.');
    } catch (err) {
      toast.error(err?.message || 'Could not set default address.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success('Address removed.');
    } catch (err) {
      toast.error(err?.message || 'Could not remove this address.');
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
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-24 bg-neutral-100 rounded-xl" />
          <div className="h-40 bg-neutral-100 rounded-xl" />
          <div className="h-40 bg-neutral-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white border border-neutral-200 rounded-xl p-6">
        <div
          className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold shrink-0"
          aria-hidden="true"
        >
          {initials || '—'}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 truncate">
            {profile?.name || 'Your account'}
          </h1>
          <p className="text-sm text-neutral-500 truncate">{profile?.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="neutral">{profile?.role}</Badge>
            {profile?.isVerified ? (
              <Badge tone="success">Verified</Badge>
            ) : (
              <Badge tone="warning">Not verified</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Personal info</h2>
        <form onSubmit={handlePersonalSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Full name
            </label>
            <Input
              id="profile-name"
              value={personalForm.name}
              onChange={handlePersonalChange('name')}
              required
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-neutral-700 mb-1">
              Phone number
            </label>
            <Input
              id="profile-phone"
              type="tel"
              value={personalForm.phone}
              onChange={handlePersonalChange('phone')}
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <Input id="profile-email" value={profile?.email || ''} disabled />
            <p className="mt-1 text-xs text-neutral-500">Email can't be changed here.</p>
          </div>
          <div className="pt-2">
            <Button type="submit" loading={savingPersonal}>
              Save changes
            </Button>
          </div>
        </form>
      </section>

      {/* Location */}
      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-900 mb-1">Delivery location</h2>
        <p className="text-sm text-neutral-500 mb-4">
          This sets which nearby sellers show up first in your product search.
        </p>

        {profile?.location?.coordinates?.some((c) => c !== 0) ? (
          <p className="text-sm text-neutral-700 mb-4">
            Currently set to{' '}
            <span className="font-medium">
              {profile.location.coordinates[1].toFixed(4)}, {profile.location.coordinates[0].toFixed(4)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-warning mb-4">
            No location set yet — you're seeing popular products instead of nearby ones.
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <Button type="button" variant="secondary" onClick={handleUseMyLocation} loading={geoLoading}>
            Use my current location
          </Button>
          <div className="flex-1">
            <PincodeInput onConfirm={handlePincodeConfirm} />
          </div>
        </div>
        {geoError && (
          <p className="mt-3 text-sm text-danger">
            Couldn't get your location automatically — enter your pincode instead.
          </p>
        )}
      </section>

      {/* Addresses */}
      <section className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Saved addresses</h2>
          <Button type="button" size="sm" onClick={openAddAddress}>
            + Add address
          </Button>
        </div>

        {(!addresses || addresses.length === 0) && (
          <p className="text-sm text-neutral-500">
            No saved addresses yet. Add one so checkout is faster next time.
          </p>
        )}

        <ul className="space-y-3">
          {addresses?.map((address) => (
            <li
              key={address._id}
              className="border border-neutral-200 rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-neutral-900">{address.label}</span>
                  {address.isDefault && <Badge tone="success">Default</Badge>}
                </div>
                <p className="text-sm text-neutral-600">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                </p>
                <p className="text-sm text-neutral-600">
                  {address.city}
                  {address.state ? `, ${address.state}` : ''} {address.pincode}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Edit ${address.label} address`}
                    onClick={() => openEditAddress(address)}
                    className="text-sm text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${address.label} address`}
                    onClick={() => setConfirmDeleteId(address._id)}
                    className="text-sm text-danger hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded"
                  >
                    Delete
                  </button>
                </div>
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(address._id)}
                    className="text-xs text-neutral-500 hover:text-neutral-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Add / edit address modal */}
      <Modal
        open={addressModalOpen}
        onClose={closeAddressModal}
        title={editingAddressId ? 'Edit address' : 'Add address'}
      >
        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <div>
            <label htmlFor="address-label" className="block text-sm font-medium text-neutral-700 mb-1">
              Label
            </label>
            <Input
              id="address-label"
              placeholder="Home, Office, ..."
              value={addressForm.label}
              onChange={handleAddressFieldChange('label')}
              required
            />
          </div>
          <div>
            <label htmlFor="address-line1" className="block text-sm font-medium text-neutral-700 mb-1">
              Address line 1
            </label>
            <Input
              id="address-line1"
              value={addressForm.line1}
              onChange={handleAddressFieldChange('line1')}
              required
            />
          </div>
          <div>
            <label htmlFor="address-line2" className="block text-sm font-medium text-neutral-700 mb-1">
              Address line 2 <span className="text-neutral-400">(optional)</span>
            </label>
            <Input
              id="address-line2"
              value={addressForm.line2}
              onChange={handleAddressFieldChange('line2')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="address-city" className="block text-sm font-medium text-neutral-700 mb-1">
                City
              </label>
              <Input
                id="address-city"
                value={addressForm.city}
                onChange={handleAddressFieldChange('city')}
                required
              />
            </div>
            <div>
              <label htmlFor="address-state" className="block text-sm font-medium text-neutral-700 mb-1">
                State / Division
              </label>
              <Input
                id="address-state"
                value={addressForm.state}
                onChange={handleAddressFieldChange('state')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="address-pincode" className="block text-sm font-medium text-neutral-700 mb-1">
              Pincode
            </label>
            <Input
              id="address-pincode"
              value={addressForm.pincode}
              onChange={handleAddressFieldChange('pincode')}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={handleAddressFieldChange('isDefault')}
              className="rounded border-neutral-300 text-blue-600 focus:ring-blue-600"
            />
            Set as default address
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeAddressModal}>
              Cancel
            </Button>
            <Button type="submit" loading={savingAddress}>
              {editingAddressId ? 'Save changes' : 'Add address'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete this address?"
      >
        <p className="text-sm text-neutral-600 mb-6">
          This can't be undone. You'll need to re-enter it if you want it back.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={() => handleDelete(confirmDeleteId)}>
            Delete address
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;