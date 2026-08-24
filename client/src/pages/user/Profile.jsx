import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  uploadAvatar,
  uploadBanner,
} from '../../features/user/userSlice';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
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

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

/* ─── quick-links shown below the avatar card ─────────────────────────────── */
const QuickLink = ({ to, icon, label, sublabel, color }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:shadow-md group ${color}`}
  >
    <div className="text-2xl">{icon}</div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
        {label}
      </p>
      <p className="text-xs text-gray-500 truncate">{sublabel}</p>
    </div>
    <svg
      className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 ml-auto shrink-0 transition-colors"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </Link>
);

/* ─── section wrapper ──────────────────────────────────────────────────────── */
const Section = ({ icon, title, subtitle, action, children }) => (
  <section className="bg-white border border-gray-100 rounded-2xl shadow-sm">
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

/* ══════════════════════════════════════════════════════════════════════════════
   Profile Component
══════════════════════════════════════════════════════════════════════════════ */
const Profile = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { profile, addresses, status, error } = useSelector((state) => state.user);
  const { location, getLocation, loading: geoLoading, error: geoError } = useGeolocation();

  /* personal-info form */
  const [personalForm, setPersonalForm] = useState({ name: '', phone: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalSuccess, setPersonalSuccess] = useState(false);

  /* address modal */
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  /* active tab: 'info' | 'location' | 'addresses' (mobile tabs) */
  const [activeTab, setActiveTab] = useState('info');

  /* upload state */
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setPersonalForm({ name: profile.name || '', phone: profile.phone || '' });
    }
  }, [profile]);

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error));
  }, [error, toast]);

  /* ── personal info ─────────────────────────────────────────────────────── */
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    setPersonalSuccess(false);
    try {
      await dispatch(updateUserProfile(personalForm)).unwrap();
      setPersonalSuccess(true);
      toast.success('Profile updated successfully.');
      setTimeout(() => setPersonalSuccess(false), 3000);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update profile.'));
    } finally {
      setSavingPersonal(false);
    }
  };

  /* ── location ──────────────────────────────────────────────────────────── */
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
    try {
      await dispatch(
        updateUserLocation({ lat: data?.lat, lng: data?.lng, pincode: pincodeVal, city: data?.city })
      ).unwrap();
      toast.success('Pincode location updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update location.'));
    }
  };

  /* ── addresses ─────────────────────────────────────────────────────────── */
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
        await dispatch(updateAddress({ addressId: editingAddressId, addressData: addressForm })).unwrap();
        toast.success('Address updated successfully.');
      } else {
        const payload = {
          ...addressForm,
          coordinates: location?.lat && location?.lng ? [location.lng, location.lat] : undefined,
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

  /* ── image uploads ──────────────────────────────────────────────────────── */
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images are allowed.');
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 5 MB.');
      return false;
    }
    return true;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !validateFile(file)) return;
    setUploadingAvatar(true);
    try {
      await dispatch(uploadAvatar(file)).unwrap();
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Avatar upload failed.'));
    } finally {
      setUploadingAvatar(false);
      // reset so same file can be re-selected
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !validateFile(file)) return;
    setUploadingBanner(true);
    try {
      await dispatch(uploadBanner(file)).unwrap();
      toast.success('Banner updated!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Banner upload failed.'));
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  /* ── derived ────────────────────────────────────────────────────────────── */
  const initials = getInitials(profile?.name);
  const hasCoordinates =
    Array.isArray(profile?.location?.coordinates) &&
    profile.location.coordinates.length === 2 &&
    profile.location.coordinates.some((c) => c !== 0);

  /* ── loading skeleton ───────────────────────────────────────────────────── */
  if (status === 'loading' && !profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  /* ── mobile tab panels ──────────────────────────────────────────────────── */
  const tabs = [
    { id: 'info', label: 'Info', icon: '👤' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'addresses', label: 'Addresses', icon: '🏠' },
  ];

  /* ══ render ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

      {/* Hidden file inputs for avatar & banner upload */}
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* ── Hero / Avatar Card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm">
        {/* Banner with cover photo support */}
        <div className="h-28 sm:h-36 relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 group">
          {profile?.banner?.url ? (
            <img
              src={profile.banner.url}
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          )}

          {/* Banner upload button */}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 backdrop-blur-xs text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Change cover banner"
          >
            {uploadingBanner ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{profile?.banner?.url ? 'Change Banner' : 'Add Banner'}</span>
              </>
            )}
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-12 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* left: avatar + name */}
            <div className="flex items-end gap-4">
              {/* Avatar with upload trigger */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold ring-4 ring-white shadow-md overflow-hidden relative">
                  {profile?.avatar?.url ? (
                    <img
                      src={profile.avatar.url}
                      alt={profile.name || 'User Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials || '👤'}</span>
                  )}

                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Edit avatar button badge */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow-md border-2 border-white transition-all transform group-hover:scale-110 disabled:opacity-50 cursor-pointer"
                  title="Change profile picture"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <div className="pb-1 space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {profile?.name || 'Your Account'}
                  </h1>
                  <Badge tone="neutral" className="capitalize font-semibold">
                    {profile?.role || 'User'}
                  </Badge>
                  {profile?.isVerified ? (
                    <Badge tone="success">✓ Verified</Badge>
                  ) : (
                    <Badge tone="warning">Pending</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 truncate">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {profile?.email}
                </p>
              </div>
            </div>

            {/* right: stats pill */}
            <div className="flex items-center gap-0 self-start sm:self-end bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shrink-0">
              <div className="px-4 py-2.5 text-center border-r border-gray-200">
                <span className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400">Addresses</span>
                <span className="text-xl font-bold text-gray-900">{addresses?.length || 0}</span>
              </div>
              <div className="px-4 py-2.5 text-center">
                <span className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400">Pincode</span>
                <span className="text-xl font-bold text-indigo-600">{profile?.pincode || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Links Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLink
          to="/orders"
          icon="📦"
          label="My Orders"
          sublabel="Track & manage your orders"
          color="bg-blue-50/60 border-blue-100 hover:border-blue-200"
        />
        <QuickLink
          to="/change-password"
          icon="🔒"
          label="Change Password"
          sublabel="Update security password"
          color="bg-purple-50/60 border-purple-100 hover:border-purple-200"
        />
        <QuickLink
          to={profile?.role === 'seller' ? '/seller/dashboard' : '/products'}
          icon={profile?.role === 'seller' ? '📊' : '🛍️'}
          label={profile?.role === 'seller' ? 'Seller Portal' : 'Shop Now'}
          sublabel={profile?.role === 'seller' ? 'Manage products & orders' : 'Browse nearby products'}
          color={profile?.role === 'seller' ? 'bg-indigo-50/60 border-indigo-100 hover:border-indigo-200' : 'bg-emerald-50/60 border-emerald-100 hover:border-emerald-200'}
        />
      </div>

      {/* ── Mobile Tab Bar ─────────────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Desktop: 3-col grid / Mobile: tab-gated panels ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className={`lg:col-span-1 space-y-6 ${activeTab !== 'info' && activeTab !== 'location' ? 'hidden lg:block' : ''}`}>

          {/* Personal Info — shown on mobile when tab=info, always on desktop */}
          <div className={activeTab === 'location' ? 'hidden lg:block' : ''}>
            <Section
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              title="Personal Info"
              subtitle="Manage your name and contact number"
            >
              <form onSubmit={handlePersonalSubmit} className="space-y-4">
                <Input
                  id="profile-name"
                  label="Full Name"
                  value={personalForm.name}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input
                  id="profile-phone"
                  label="Phone Number"
                  type="tel"
                  placeholder="Enter phone number"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, phone: e.target.value }))}
                />
                <div>
                  <Input
                    id="profile-email"
                    label="Email Address"
                    value={profile?.email || ''}
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1">Email is managed by your account login.</p>
                </div>

                {personalSuccess && (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Profile saved successfully!
                  </div>
                )}

                <Button type="submit" loading={savingPersonal} className="w-full">
                  Save Personal Info
                </Button>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Password & Security</span>
                  <Link
                    to="/change-password"
                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Change Password →
                  </Link>
                </div>
              </form>
            </Section>
          </div>

          {/* Delivery Location — shown on mobile when tab=location, always on desktop */}
          <div className={activeTab === 'info' ? 'hidden lg:block' : ''}>
            <Section
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title="Delivery Location"
              subtitle="Shows nearby products first"
            >
              {/* Current location display */}
              {hasCoordinates || profile?.pincode ? (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-4">
                  {profile?.pincode && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Active Pincode</span>
                      <span className="text-base font-bold text-indigo-900">
                        {profile.pincode}
                        {profile?.city ? ` · ${profile.city}` : ''}
                      </span>
                    </div>
                  )}
                  {hasCoordinates && (
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-indigo-100 flex items-center gap-1">
                      <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      GPS: {profile.location.coordinates[1].toFixed(4)}, {profile.location.coordinates[0].toFixed(4)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mb-4 text-xs text-amber-800 flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  No delivery location set. Add your pincode to see nearby products.
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUseMyLocation}
                  loading={geoLoading}
                  className="w-full gap-2"
                >
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Use Device GPS
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
            </Section>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Saved Addresses ─────────────────────────────────── */}
        <div className={`lg:col-span-2 ${activeTab !== 'addresses' ? 'hidden lg:block' : ''}`}>
          <Section
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
            title="Saved Addresses"
            subtitle="Manage your shipping destinations"
            action={
              <Button type="button" size="sm" onClick={openAddAddress} className="flex items-center gap-1.5 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add Address</span>
                <span className="sm:hidden">Add</span>
              </Button>
            }
          >
            {!addresses || addresses.length === 0 ? (
              /* Empty state */
              <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No saved addresses yet</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                  Add a delivery address to complete checkout faster.
                </p>
                <Button type="button" variant="secondary" onClick={openAddAddress}>
                  + Add Address
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div
                    key={address._id}
                    className={`relative border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${
                      address.isDefault
                        ? 'border-indigo-400 bg-indigo-50/30 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Default ribbon */}
                    {address.isDefault && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg rounded-tr-xl">
                          DEFAULT
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pr-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-bold text-gray-900 text-sm">{address.label}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-0.5 leading-relaxed">
                        <p className="font-medium text-gray-800">{address.line1}</p>
                        {address.line2 && <p className="text-gray-500">{address.line2}</p>}
                        <p>{address.city}{address.state ? `, ${address.state}` : ''}</p>
                        <p className="text-indigo-700 font-semibold pt-0.5">
                          <span className="text-xs text-gray-400 font-normal">Pincode: </span>
                          {address.pincode}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      {!address.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address._id)}
                          className="text-xs font-medium text-gray-500 hover:text-indigo-600 hover:underline transition-colors"
                        >
                          Set as default
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Primary shipping
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditAddress(address)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(address._id)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* ── Add / Edit Address Modal ───────────────────────────────────────── */}
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
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={handleAddressFieldChange('isDefault')}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Set as default shipping address</span>
            </label>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={closeAddressModal}>
              Cancel
            </Button>
            <Button type="submit" loading={savingAddress}>
              {editingAddressId ? 'Update Address' : 'Save Address'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Address"
      >
        <div className="space-y-4 py-1">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this address? This action cannot be undone.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-100">
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