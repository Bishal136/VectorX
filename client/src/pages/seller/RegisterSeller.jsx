import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerSeller, clearSellerError } from '../../features/seller/sellerSlice';
import { fetchCurrentUser } from '../../features/auth/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const RegisterSeller = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { actionLoading, error } = useSelector((state) => state.seller);
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    shopName: '',
    shopAddress: {
      line1: '',
      city: '',
      pincode: '',
    },
    location: {
      type: 'Point',
      coordinates: [90.4125, 23.8103], // [lng, lat] default Dhaka
    },
    gstNumber: '',
    panNumber: '',
    bankDetails: {
      accountHolderName: user?.name || '',
      accountNumber: '',
      ifsc: '',
    },
  });

  const [formError, setFormError] = useState('');
  const [geoDetecting, setGeoDetecting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoDetecting(true);
    setFormError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          location: {
            type: 'Point',
            coordinates: [pos.coords.longitude, pos.coords.latitude],
          },
        }));
        setGeoDetecting(false);
      },
      (err) => {
        setFormError(err.message || 'Unable to retrieve location.');
        setGeoDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    dispatch(clearSellerError());

    if (!formData.shopName.trim() || formData.shopName.trim().length < 3) {
      setFormError('Shop name must be at least 3 characters.');
      return;
    }
    if (
      !formData.shopAddress.line1.trim() ||
      !formData.shopAddress.city.trim() ||
      !formData.shopAddress.pincode.trim()
    ) {
      setFormError('Complete shop address (Street, City, Pincode) is required.');
      return;
    }

    const payload = {
      shopName: formData.shopName.trim(),
      shopAddress: {
        line1: formData.shopAddress.line1.trim(),
        city: formData.shopAddress.city.trim(),
        pincode: formData.shopAddress.pincode.trim(),
      },
      location: formData.location,
    };

    if (formData.gstNumber.trim()) payload.gstNumber = formData.gstNumber.trim();
    if (formData.panNumber.trim()) payload.panNumber = formData.panNumber.trim();
    if (
      formData.bankDetails.accountHolderName.trim() ||
      formData.bankDetails.accountNumber.trim() ||
      formData.bankDetails.ifsc.trim()
    ) {
      payload.bankDetails = {
        accountHolderName: formData.bankDetails.accountHolderName.trim(),
        accountNumber: formData.bankDetails.accountNumber.trim(),
        ifsc: formData.bankDetails.ifsc.trim(),
      };
    }

    const res = await dispatch(registerSeller(payload));
    if (!res.error) {
      dispatch(fetchCurrentUser());
      setSubmittedSuccess(true);
    } else {
      setFormError(res.payload || 'Registration failed. Please check your details.');
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-200 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Registration Submitted!
          </h2>
          <p className="text-gray-600 max-w-md mx-auto text-sm">
            Thank you for registering <strong>{formData.shopName}</strong>. Your application is now in the verification queue.
            Our team will review your business credentials within 24–48 hours.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/seller/dashboard')}
            >
              Go to Seller Dashboard
            </Button>
            <Link to="/">
              <Button variant="secondary">Back to Store</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Brand & Introduction Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          VectorX Merchant Program
        </span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-3">
          Become a Verified Seller
        </h1>
        <p className="text-sm text-gray-600 max-w-lg mx-auto mt-2">
          Reach thousands of local buyers with distance-based discovery. Fast local fulfillment and lower delivery times.
        </p>
      </div>

      {(formError || error) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {formError || error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Shop Information */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-gray-900 pb-2 border-b border-gray-100">
            1. Shop Identity
          </h2>

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
              placeholder="e.g. GSTIN12345"
            />
            <Input
              label="PAN / Tax ID (Optional)"
              value={formData.panNumber}
              onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
              placeholder="e.g. PAN12345"
            />
          </div>
        </div>

        {/* Step 2: Physical Address & Geolocation */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              2. Store Address & Geolocation
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Buyers nearest to this location will see your products ranked first.
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
            placeholder="e.g. 123 Main Street, Ground Floor"
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

          {/* Coordinates */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase">
                Location Coordinates
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDetectLocation}
                loading={geoDetecting}
              >
                📍 Auto-Detect Current GPS Coordinates
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-gray-500 block mb-1">Longitude</label>
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="text-gray-500 block mb-1">Latitude</label>
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Payout Banking Information */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-gray-900 pb-2 border-b border-gray-100">
            3. Payout Bank Account (Optional)
          </h2>

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
              placeholder="Bank Account Number"
            />
            <Input
              label="IFSC / Swift / Branch Code"
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-800">
            ← Cancel and return home
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={actionLoading}
          >
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RegisterSeller;
