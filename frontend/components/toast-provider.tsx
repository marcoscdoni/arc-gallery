'use client'

import { Toaster as Sonner } from 'sonner'

/**
 * Modern toast notification provider using Sonner
 * Provides beautiful, accessible toast notifications
 */
export function ToastProvider() {
  return (
    <Sonner
      position="top-right"
      expand={true}
      richColors
      closeButton={false}
      theme="dark"
      duration={3000}
      toastOptions={{
        style: {
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
        },
        className: 'glass-card',
      }}
    />
  )
}
