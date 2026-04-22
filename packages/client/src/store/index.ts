import { configureStore } from '@reduxjs/toolkit';

import { apiSlice } from '../api/api.slice';
import filesReducer from './files.slice';
import userReducer from './user.slice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    files: filesReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
