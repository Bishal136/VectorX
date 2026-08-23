import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSellerProfile,
  updateSellerProfile,
  fetchEarnings,
  clearSellerError,
} from '../../features/seller/sellerSlice';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const ShopProfile = () => {
  const dispatch = useDispatch();
  const { profile, earnings, status, actionLoading, error } = useSelector(
    (state) => state.seller
  );

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

  useEffect(() => {
    dispatch(fetchSellerProfile());
    dispatch(fetchEarnings('month'));
  }, [dispatch]);

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
    }
  }, [profile]);

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
    };

    const res = await dispatch(updateSellerProfile(payload));
    if (!res.error) {
      setSuccessMessage('Shop profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const getVerificationTone = (verStatus) => {
    if (verStatus === 'approved') return 'success';
    if (verStatus === 'rejected') return 'danger';
    return 'warning';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Shop Profile & Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your storefront details, GPS coordinates for distance-based ranking, and financial setup.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>✓</span> {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Verification Status Card */}
      {profile && (
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-gray-900 text-base">
                Verification Status
              </h3>
              <Badge
                tone={getVerificationTone(profile.verificationStatus)}
                className="capitalize"
              >
                {profile.verificationStatus || 'Pending'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              {profile.verificationStatus === 'approved'
                ? 'Your shop is fully verified and your products are active for nearby buyers.'
                : profile.verificationStatus === 'rejected'
                ? `Rejected: ${profile.rejectionReason || 'Please update your details and save to re-request verification.'}`
                : 'Your profile is awaiting KYC review by our administrative team.'}
            </p>
          </div>
          <div className="text-xs text-gray-400">
            Registered:{' '}
            {profile.createdAt
              ? new Date(profile.createdAt).toLocaleDateString()
              : 'N/A'}
          </div>
        </div>
      )}

      {/* Earnings Overview Card */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200/80 shadow-xs">
        <h3 className="font-bold text-gray-900 text-base mb-4">
          Store Earnings Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              Total Earnings (30 Days)
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(earnings?.totalEarnings)}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              Fitted Orders
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {earnings?.orderCount || 0}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              Average Order Value
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(earnings?.averageOrderValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Store Details */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-base pb-2 border-b border-gray-100">
            Store Identity
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

        {/* Section 2: Address & Geolocation */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              Shop Address & Geolocation Coordinates
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              VectorX calculates delivery proximity using these coordinates so local buyers find you first.
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
              <p className="text-xs text-red-600 font-medium">{geoError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
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
                <label className="block text-xs text-gray-500 mb-1">
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

        {/* Section 3: Bank Details */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
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

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <Button type="submit" variant="primary" size="lg" loading={actionLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ShopProfile;
