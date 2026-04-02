import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase';

const ensureAuth = () => {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está configurado. Revisa variables VITE_FIREBASE_*');
  }
  return auth;
};

export const registerWithEmailPassword = async (email: string, password: string): Promise<User> => {
  const auth = ensureAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const loginWithEmailPassword = async (email: string, password: string): Promise<User> => {
  const auth = ensureAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const logoutCurrentUser = async (): Promise<void> => {
  const auth = ensureAuth();
  await signOut(auth);
};

export const subscribeAuthState = (callback: (user: User | null) => void): (() => void) => {
  const auth = ensureAuth();
  return onAuthStateChanged(auth, callback);
};

export const changeCurrentUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const auth = ensureAuth();
  const user = auth.currentUser;

  if (!user || !user.email) {
    throw new Error('No hay una sesión activa para cambiar contraseña');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};
