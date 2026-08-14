'use client';
import { Toaster } from 'sonner';

// Mounted by BOTH layouts — admin and public. sonner's toast() is a
// no-op unless a <Toaster /> exists somewhere in the tree, so any
// public form that reports errors through it (newsletter subscribe,
// join-club) silently swallowed them while this lived in the admin
// layout alone.
export default function ToasterClient() {
  return <Toaster position="top-right" richColors closeButton />;
}
