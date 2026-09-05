import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSellerProfile,
  updateSellerProfile,
  uploadSellerLogo,
  uploadSellerBanner,
  requestSellerVerification,
  fetchEarnings,
  clearSellerError,
} from '../../features/seller/sellerSlice';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import defaultBannerCover from '../../assets/bannar/seller-banner-cover.png';
import defaultSellerAvatar from '../../assets/bannar/seller-avatar.png';

const formatCurrency = (amount) => {
  return `৳${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const DEFAULT_SKILLS = [
  'HTML',
  'Wordpress',
  'PHP',
  'CSS',
  'Node.js',
  'React.js',
  'Shopify Stores',
  'JavaScript',
  'CMS',
];

const ShopProfile = () => {
  const dispatch = useDispatch();
  const { profile, earnings, status, actionLoading, error } = useSelector(
    (state) => state.seller
  );

  // Hidden file input refs
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Upload progress states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Active settings tab: 'identity' | 'location' | 'payout'
  const [activeTab, setActiveTab] = useState('identity');

  // Quick edit profile modal form state
  const [profileForm, setProfileForm] = useState({
    ownerName: '',
    shopName: '',
    headline: '',
    bio: '',
    skills: DEFAULT_SKILLS,
    linkedin: '',
    website: '',
    github: '',
    twitter: '',
    bannerSlogan: '',
    bannerSubtitle: '',
  });

  // New skill input inside edit modal
  const [newSkillInput, setNewSkillInput] = useState('');

  // Verification request form state
  const [verifyForm, setVerifyForm] = useState({
    gstNumber: '',
    panNumber: '',
  });

  // Core shop settings form state (address, bank, GPS)
  const [formData, setFormData] = useState({
    shopName: '',
    shopAddress: {
      line1: '',
      city: '',
      pincode: '',
    },
    location: {
      type: 'Point',
      coordinates: [90.4125, 23.8103], // [lng, lat]
    },
    gstNumber: '',
    panNumber: '',
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifsc: '',
    },
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [geoDetecting, setGeoDetecting] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Load profile and 30-day earnings on mount
  useEffect(() => {
    dispatch(fetchSellerProfile());
    dispatch(fetchEarnings('month'));
  }, [dispatch]);

  // Sync profile data into form states
  useEffect(() => {
    if (profile) {
      setFormData({
        shopName: profile.shopName || '',
        shopAddress: {
          line1: profile.shopAddress?.line1 || '',
          city: profile.shopAddress?.city || '',
          pincode: profile.shopAddress?.pincode || '',
        },
        location: {
          type: 'Point',
          coordinates: profile.location?.coordinates || [90.4125, 23.8103],
        },
        gstNumber: profile.gstNumber || '',
        panNumber: profile.panNumber || '',
        bankDetails: {
          accountHolderName: profile.bankDetails?.accountHolderName || '',
          accountNumber: profile.bankDetails?.accountNumber || '',
          ifsc: profile.bankDetails?.ifsc || '',
        },
      });

      setProfileForm({
        ownerName: profile.user?.name || '',
        shopName: profile.shopName || '',
        headline:
          profile.headline ||
          'Full-Stack Developer | UI/UX Designer | Server Manager | Tech Counsultant',
        bio: profile.bio || '',
        skills: profile.skills && profile.skills.length > 0 ? profile.skills : DEFAULT_SKILLS,
        linkedin: profile.socialLinks?.linkedin || '',
        website: profile.socialLinks?.website || '',
        github: profile.socialLinks?.github || '',
        twitter: profile.socialLinks?.twitter || '',
        bannerSlogan:
          profile.banner?.slogan ||
          'Building The Future with Code, Creativity, and Technology',
        bannerSubtitle: profile.banner?.subtitle || 'Innovate, Create ★★★★★',
      });

      setVerifyForm({
        gstNumber: profile.gstNumber || '',
        panNumber: profile.panNumber || '',
      });
    }
  }, [profile]);

  // Handle GPS coordinate detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoDetecting(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          location: {
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude],
          },
        }));
        setGeoDetecting(false);
      },
      (err) => {
        setGeoError(err.message || 'Unable to retrieve location coordinates.');
        setGeoDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Upload avatar / logo
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file must be under 5 MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      await dispatch(uploadSellerLogo(file)).unwrap();
      setSuccessMessage('Store avatar updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Upload cover banner
  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Only JPG, PNG or WebP images are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Banner image file must be under 10 MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      await dispatch(uploadSellerBanner(file)).unwrap();
      setSuccessMessage('Store banner updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  // Submit quick edit profile modal
  const handleProfileFormSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    dispatch(clearSellerError());

    const payload = {
      name: profileForm.ownerName.trim(),
      shopName: profileForm.shopName.trim(),
      headline: profileForm.headline.trim(),
      bio: profileForm.bio.trim(),
      skills: profileForm.skills,
      socialLinks: {
        linkedin: profileForm.linkedin.trim(),
        website: profileForm.website.trim(),
        github: profileForm.github.trim(),
        twitter: profileForm.twitter.trim(),
      },
      banner: {
        ...(profile?.banner || {}),
        slogan: profileForm.bannerSlogan.trim(),
        subtitle: profileForm.bannerSubtitle.trim(),
      },
    };

    const res = await dispatch(updateSellerProfile(payload));
    if (!res.error) {
      setSuccessMessage('Profile details updated successfully!');
      setIsEditModalOpen(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Add a skill tag in edit modal
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !profileForm.skills.includes(trimmed)) {
      setProfileForm((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setNewSkillInput('');
    }
  };

  // Remove a skill tag
  const handleRemoveSkill = (skillToRemove) => {
    setProfileForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Submit verification request modal
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    dispatch(clearSellerError());

    const res = await dispatch(requestSellerVerification(verifyForm));
    if (!res.error) {
      setSuccessMessage('Verification request submitted for admin review!');
      setIsVerifyModalOpen(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Submit lower settings form (address, coordinates, tax, bank)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    dispatch(clearSellerError());

    const payload = {
      shopName: formData.shopName.trim(),
      shopAddress: {
        line1: formData.shopAddress.line1.trim(),
        city: formData.shopAddress.city.trim(),
        pincode: formData.shopAddress.pincode.trim(),
      },
      location: formData.location,
      gstNumber: formData.gstNumber.trim(),
      panNumber: formData.panNumber.trim(),
      bankDetails: {
        accountHolderName: formData.bankDetails.accountHolderName.trim(),
        accountNumber: formData.bankDetails.accountNumber.trim(),
        ifsc: formData.bankDetails.ifsc.trim(),
      },
    };

    const res = await dispatch(updateSellerProfile(payload));
    if (!res.error) {
      setSuccessMessage('Shop settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  // Current display data with fallback
  const displayName = profile?.user?.name || profile?.shopName || 'Name Last-name';
  const displayHeadline =
    profile?.headline ||
    'Full-Stack Developer | UI/UX Designer | Server Manager | Tech Counsultant';
  const displayCompanyName = profile?.shopName || 'Company Name';
  const activeSkills =
    profile?.skills && profile.skills.length > 0 ? profile.skills : DEFAULT_SKILLS;
  const avatarSrc = profile?.logo?.url || profile?.user?.avatar?.url || defaultSellerAvatar;
  const bannerSrc = profile?.banner?.url || defaultBannerCover;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-3 sm:px-6">
      {/* Hidden File Inputs for Logo & Banner */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-xs transition-all">
          <span className="text-emerald-600 font-bold">✓</span> {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-700 p-4 rounded-xl text-sm font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          HERO PROFILE & BANNER CARD (MATCHING USER REFERENCE DESIGN)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-md overflow-hidden transition-all">
        {/* Banner Section */}
        <div className="relative w-full h-48 sm:h-64 md:h-72 bg-slate-950 overflow-hidden group">
          <img
            src={bannerSrc}
            alt="Store Cover Banner"
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
          />

          {/* Slogan and Tech Badges overlay if no custom uploaded banner image */}
          {!profile?.banner?.url && (
            <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/20 to-black/60 pointer-events-none" />
          )}

          {/* Change Banner Button Overlay */}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            className="absolute top-3.5 right-3.5 bg-black/60 hover:bg-black/85 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-xs border border-white/20 transition-all cursor-pointer shadow-md disabled:opacity-50"
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
                <span>Change Banner</span>
              </>
            )}
          </button>
        </div>

        {/* Profile Details Bar Below Banner */}
        <div className="px-5 sm:px-8 pb-6 pt-2 relative">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            {/* Left Cluster: Overlapping Avatar + Name + Verification + Headline */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
              {/* Overlapping Avatar */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 group">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-slate-900 relative">
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />

                  {/* Uploading Spinner */}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Change Avatar Button Trigger */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full ring-2 ring-white shadow-lg transition-transform group-hover:scale-110 cursor-pointer disabled:opacity-50"
                  title="Change profile avatar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* Name, Verification, and Headline */}
              <div className="space-y-1.5 pt-1 sm:pt-0">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {displayName}
                  </h2>

                  {/* Verification Badge Button (Matching reference dashed outline style) */}
                  {profile?.verificationStatus === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Merchant
                    </span>
                  ) : profile?.verificationStatus === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => setIsVerifyModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                      title="Click to view verification status"
                    >
                      <span>🕒 Verification Pending</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsVerifyModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 border-dashed border-sky-400 bg-sky-50/70 hover:bg-sky-100 text-sky-700 hover:text-sky-900 transition-all cursor-pointer shadow-2xs group/btn"
                    >
                      <svg className="w-4 h-4 text-sky-600 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Add verification badge</span>
                    </button>
                  )}
                </div>

                {/* Headline / Roles */}
                <p className="text-sm sm:text-base text-slate-600 font-medium leading-snug">
                  {displayHeadline}
                </p>
              </div>
            </div>

            {/* Right Cluster: LinkedIn + Edit Pencil + Company Name */}
            <div className="flex items-center gap-4 sm:gap-5 self-start md:self-center pt-2 md:pt-4">
              {/* LinkedIn Icon */}
              {profile?.socialLinks?.linkedin ? (
                <a
                  href={profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center font-bold text-lg shadow-sm transition-transform hover:scale-105"
                  title="Visit LinkedIn Profile"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.62 1.62 0 1 0 0-3.24 1.62 1.62 0 0 0 0 3.24m1.39 9.74V9.93H5.07v8.57h2.78z" />
                  </svg>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm transition-transform hover:scale-105 cursor-pointer"
                  title="Add your LinkedIn profile"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.62 1.62 0 1 0 0-3.24 1.62 1.62 0 0 0 0 3.24m1.39 9.74V9.93H5.07v8.57h2.78z" />
                  </svg>
                </button>
              )}

              {/* Edit (Pencil) Icon Button */}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-300 hover:border-gray-400 hover:bg-gray-100 text-gray-700 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-2xs"
                title="Edit profile & headline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {/* Company / Shop Name with Red 3-Dot Logo */}
              <div className="flex items-center gap-2 pl-1">
                <span className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center gap-0.5 text-white shadow-xs shrink-0">
                  <span className="w-1 h-1 bg-white rounded-full"></span>
                  <span className="w-1 h-1 bg-white rounded-full"></span>
                  <span className="w-1 h-1 bg-white rounded-full"></span>
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[160px] sm:max-w-[220px]">
                  {displayCompanyName}
                </span>
              </div>
            </div>
          </div>

          {/* Skills & Badges Chips */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
              Tech & Services:
            </span>
            {activeSkills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/70 transition-colors"
              >
                {skill}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline ml-1 cursor-pointer"
            >
              + Edit Badges
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VERIFICATION STATUS & EARNINGS OVERVIEW
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Verification Status Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                KYC Verification
              </span>
              <Badge
                tone={
                  profile?.verificationStatus === 'approved'
                    ? 'success'
                    : profile?.verificationStatus === 'rejected'
                    ? 'danger'
                    : 'warning'
                }
                className="capitalize"
              >
                {profile?.verificationStatus || 'Pending'}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {profile?.verificationStatus === 'approved'
                ? 'Your store is verified with active 2dsphere geolocation ranking for nearby buyers.'
                : profile?.verificationStatus === 'rejected'
                ? `Rejected: ${profile?.rejectionReason || 'Please update your details and re-apply.'}`
                : 'Your profile is awaiting KYC review by our administrative team.'}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Joined: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              className="text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Manage KYC →
            </button>
          </div>
        </div>

        {/* 30-Day Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Total Revenue (30 Days)
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(earnings?.totalEarnings)}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Calculated across confirmed orders
          </p>
        </div>

        {/* Orders & AOV */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-around text-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Fulfilled Orders
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {earnings?.orderCount || 0}
            </p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Avg Order Value
            </span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">
              {formatCurrency(earnings?.averageOrderValue)}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STORE SETTINGS NAVIGATION TABS
      ══════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'identity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🏪 Store Identity & Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'location'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📍 Address & GPS Geolocation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payout')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'payout'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💳 Payout Bank Account
          </button>
        </nav>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: Store Identity & Tax */}
        {activeTab === 'identity' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-gray-900 text-base pb-2 border-b border-gray-100">
              Store & Business Identity
            </h3>

            <Input
              label="Shop / Business Name"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              placeholder="e.g. Apex Electronics Dhaka"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GST / Business Reg Number (Optional)"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="e.g. 22AAAAA0000A1Z5"
              />
              <Input
                label="PAN / Tax ID (Optional)"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                placeholder="e.g. ABCDE1234F"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Address & Geolocation */}
        {activeTab === 'location' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                Shop Address & Geolocation Coordinates
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                VectorX calculates spherical distance to buyers using 2dsphere indexing so nearby customers order from you first.
              </p>
            </div>

            <Input
              label="Street Address Line 1"
              required
              value={formData.shopAddress.line1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shopAddress: { ...formData.shopAddress, line1: e.target.value },
                })
              }
              placeholder="e.g. Road 27, House 42, Dhanmondi"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City"
                required
                value={formData.shopAddress.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shopAddress: { ...formData.shopAddress, city: e.target.value },
                  })
                }
                placeholder="e.g. Dhaka"
              />
              <Input
                label="Pincode / Postal Code"
                required
                value={formData.shopAddress.pincode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shopAddress: { ...formData.shopAddress, pincode: e.target.value },
                  })
                }
                placeholder="e.g. 1205"
              />
            </div>

            {/* Coordinates Inputs */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  GPS Coordinates (Longitude & Latitude)
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDetectLocation}
                  loading={geoDetecting}
                >
                  📍 Use My Current Location
                </Button>
              </div>

              {geoError && (
                <p className="text-xs text-rose-600 font-medium">{geoError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Longitude ([-180, 180])
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.location.coordinates[0]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          coordinates: [
                            parseFloat(e.target.value) || 0,
                            formData.location.coordinates[1],
                          ],
                        },
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Latitude ([-90, 90])
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.location.coordinates[1]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: {
                          ...formData.location,
                          coordinates: [
                            formData.location.coordinates[0],
                            parseFloat(e.target.value) || 0,
                          ],
                        },
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Payout Bank Account */}
        {activeTab === 'payout' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-gray-900 text-base pb-2 border-b border-gray-100">
              Payout Bank Account
            </h3>

            <Input
              label="Account Holder Name"
              value={formData.bankDetails.accountHolderName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    accountHolderName: e.target.value,
                  },
                })
              }
              placeholder="Account holder full name"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Number"
                type="password"
                value={formData.bankDetails.accountNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: {
                      ...formData.bankDetails,
                      accountNumber: e.target.value,
                    },
                  })
                }
                placeholder="••••••••••••"
              />
              <Input
                label="IFSC / Routing Code"
                value={formData.bankDetails.ifsc}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, ifsc: e.target.value },
                  })
                }
                placeholder="e.g. SBIN0001234"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={actionLoading}
            className="w-full sm:w-auto"
          >
            Save Changes
          </Button>
        </div>
      </form>

      {/* ══════════════════════════════════════════════════════════════
          QUICK PROFILE & HEADER EDIT MODAL (PENCIL ICON)
      ══════════════════════════════════════════════════════════════ */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Header & Store Branding"
        size="xl"
      >
        <form onSubmit={handleProfileFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Personal / Owner Name"
              required
              value={profileForm.ownerName}
              onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
              placeholder="e.g. John Doe"
            />
            <Input
              label="Company / Shop Name"
              required
              value={profileForm.shopName}
              onChange={(e) => setProfileForm({ ...profileForm, shopName: e.target.value })}
              placeholder="e.g. VectorX Tech Solutions"
            />
          </div>

          <Input
            label="Professional Headline / Roles"
            required
            value={profileForm.headline}
            onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
            placeholder="e.g. Full-Stack Developer | UI/UX Designer | Server Manager"
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Store Bio / About
            </label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              placeholder="Brief description of your business and specialty..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Skills / Badges Editor */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Featured Tech & Service Badges
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add badge (e.g. Vue.js, Python, AWS)"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSkill}>
                + Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
              {profileForm.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-gray-800 border border-gray-300 shadow-2xs"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-gray-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Social Profiles & Links
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="LinkedIn Profile URL"
                value={profileForm.linkedin}
                onChange={(e) => setProfileForm({ ...profileForm, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              <Input
                label="Website URL"
                value={profileForm.website}
                onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                placeholder="https://yourstore.com"
              />
              <Input
                label="GitHub URL (Optional)"
                value={profileForm.github}
                onChange={(e) => setProfileForm({ ...profileForm, github: e.target.value })}
                placeholder="https://github.com/username"
              />
              <Input
                label="Twitter / X (Optional)"
                value={profileForm.twitter}
                onChange={(e) => setProfileForm({ ...profileForm, twitter: e.target.value })}
                placeholder="https://x.com/username"
              />
            </div>
          </div>

          {/* Banner Slogan */}
          <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Banner Slogan"
              value={profileForm.bannerSlogan}
              onChange={(e) => setProfileForm({ ...profileForm, bannerSlogan: e.target.value })}
              placeholder="e.g. Building The Future with Code, Creativity, and Technology"
            />
            <Input
              label="Banner Subtitle / Stars"
              value={profileForm.bannerSubtitle}
              onChange={(e) => setProfileForm({ ...profileForm, bannerSubtitle: e.target.value })}
              placeholder="e.g. Innovate, Create ★★★★★"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          VERIFICATION BADGE WORKFLOW MODAL
      ══════════════════════════════════════════════════════════════ */}
      <Modal
        open={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Store Verification Badge"
        size="md"
      >
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-950 text-sm">
              <span>🛡️</span> Verified Merchant Perks
            </div>
            <ul className="list-disc pl-4 space-y-1 text-sky-800">
              <li>Official Verified Seller badge displayed on all product cards.</li>
              <li>Prioritized in 2dsphere location searches for nearby buyers.</li>
              <li>Increased conversion rates with verified buyer trust.</li>
            </ul>
          </div>

          {profile?.verificationStatus === 'rejected' && profile?.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
              <span className="font-bold">Previous rejection reason:</span> {profile.rejectionReason}
            </div>
          )}

          <Input
            label="GST / Business Registration Number"
            required
            value={verifyForm.gstNumber}
            onChange={(e) => setVerifyForm({ ...verifyForm, gstNumber: e.target.value })}
            placeholder="e.g. 22AAAAA0000A1Z5"
          />

          <Input
            label="PAN / Tax Identification Number"
            required
            value={verifyForm.panNumber}
            onChange={(e) => setVerifyForm({ ...verifyForm, panNumber: e.target.value })}
            placeholder="e.g. ABCDE1234F"
          />

          <div className="pt-4 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsVerifyModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
              disabled={profile?.verificationStatus === 'approved'}
            >
              {profile?.verificationStatus === 'pending' ? 'Update & Re-Submit' : 'Submit for Badge'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShopProfile;
