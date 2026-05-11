import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrrgqwinrupgbngunslo.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycmdxd2lucnVwZ2JuZ3Vuc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Njk3NzgsImV4cCI6MjA5NDA0NTc3OH0.5l1GELDtUOea5EoXvHjG0NK734tQvqb_uP-myjzmVeE';

// Use AsyncStorage on native, localStorage shim on web
const storage =
  Platform.OS !== 'web'
    ? AsyncStorage
    : {
        getItem: (key: string) =>
          Promise.resolve(
            typeof localStorage !== 'undefined'
              ? localStorage.getItem(key)
              : null
          ),
        setItem: (key: string, value: string) => {
          if (typeof localStorage !== 'undefined')
            localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof localStorage !== 'undefined')
            localStorage.removeItem(key);
          return Promise.resolve();
        },
      };

// Disable distributed locking on native (navigator.locks is browser-only)
const lock =
  Platform.OS !== 'web'
    ? async (_name: string, _timeout: number, fn: () => Promise<any>) => fn()
    : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    ...(lock ? { lock } : {}),
  },
});
