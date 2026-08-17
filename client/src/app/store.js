// src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import rootReducer from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
    // .concat(authApi.middleware)   // uncomment when API is ready
});

// Enable refetchOnFocus/refetchOnReconnect (useful for RTK Query)
setupListeners(store.dispatch);