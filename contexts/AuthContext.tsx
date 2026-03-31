import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Auth from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface AuthContextType {
  user: Auth.User | null;
  loading: boolean;
  loginGuest: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    // Listen for auth state changes using modular SDK
    const unsubscribeAuth = Auth.onAuthStateChanged(auth, async (currentUser) => {
      
      // Clean up previous user listener if exists
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (currentUser) {
        setUser(currentUser);

        // REAL-TIME SECURITY CHECK: Listen to the user's Firestore document
        // If Admin deletes the user doc or changes status to disabled, logout immediately.
        const userRef = doc(db, "users", currentUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, async (snapshot) => {
            // 1. Check if document exists
            if (!snapshot.exists()) {
                // Allow a grace period (15s) for new signups where doc hasn't been created yet by Auth screen
                const creationTime = new Date(currentUser.metadata.creationTime || 0).getTime();
                const now = Date.now();
                const isNewAccount = (now - creationTime) < 15000; 

                if (!isNewAccount) {
                    console.warn("User document not found (Deleted by Admin). Forcing logout.");
                    await Auth.signOut(auth);
                    setUser(null);
                }
                setLoading(false);
                return;
            }

            // 2. Check User Status (Ban/Suspend)
            const userData = snapshot.data();
            if (userData?.status === 'disabled' || userData?.status === 'suspended') {
                console.warn(`User status is ${userData.status}. Forcing logout.`);
                await Auth.signOut(auth);
                setUser(null);
            }
            
            setLoading(false);
        }, (error) => {
            console.error("Auth Security Listener Error:", error);
            setLoading(false);
        });

        // Sync basic profile data (Last Login, IP) in background
        syncUserProfile(currentUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth Listener Error:", error);
      setLoading(false);
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const syncUserProfile = async (currentUser: Auth.User) => {
      try {
          // Check if doc exists first to prevent reviving deleted users on refresh
          const userRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(userRef);
          
          // Only sync if doc exists OR it's a brand new account (created < 15s ago)
          const creationTime = new Date(currentUser.metadata.creationTime || 0).getTime();
          const isNewAccount = (Date.now() - creationTime) < 15000;

          if (!docSnap.exists() && !isNewAccount) {
              return; // Do not recreate deleted user
          }

          // Attempt to fetch IP data (background, don't block)
          let ipDetails = {};
          try {
              const res = await fetch('https://ipwho.is/');
              const data = await res.json();
              if (data.success) {
                  ipDetails = {
                      ip: data.ip,
                      location: `${data.city}, ${data.country}`,
                      isp: data.connection?.isp || data.connection?.org,
                      userAgent: navigator.userAgent
                  };
              }
          } catch (e) {
              console.error("IP Fetch error in background", e);
          }

          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            lastLogin: new Date().toISOString(),
            isAnonymous: currentUser.isAnonymous,
            createdAt: currentUser.metadata.creationTime,
            ...ipDetails // Updates latest IP info on every login/sync
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
  };

  const loginGuest = async () => {
    try {
      await Auth.signInAnonymously(auth);
    } catch (error) {
      console.error("Guest login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    Auth.signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};