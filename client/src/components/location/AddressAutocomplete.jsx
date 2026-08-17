const AddressAutocomplete = ({ onSelect }) => {
  // For now, just a dummy input. Later, replace with Google Places Autocomplete.
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search address…"
        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
      />
    </div>
  );
};

export default AddressAutocomplete;