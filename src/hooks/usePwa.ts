import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwa() {
  const [online, setOnline] = useState(navigator.onLine)
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  )
  const [registrationError, setRegistrationError] = useState(false)
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const updateRequested = useRef(false)
  const reloadRequestedUpdate = () => {
    if (updateRequested.current) {
      updateRequested.current = false
      window.location.reload()
    }
  }
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onNeedReload: reloadRequestedUpdate,
    onRegisteredSW(_url, value) { registration.current = value },
    onRegisterError() { setRegistrationError(true) },
  })
  const [cached, setCached] = useState(false)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent) }
    const onInstalled = () => { setInstalled(true); setInstallEvent(null) }
    const onFocus = () => {
      if (navigator.onLine) void registration.current?.update().catch(() => undefined)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('focus', onFocus)
    // Workbox can classify an update immediately after first install as external.
    // controllerchange also handles that case, while keeping reloads user initiated.
    navigator.serviceWorker?.addEventListener('controllerchange', reloadRequestedUpdate)
    let active = true
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration().then((r) => {
        if (active && r?.active) setCached(true)
      }).catch(() => undefined)
    }
    return () => {
      active = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('focus', onFocus)
      navigator.serviceWorker?.removeEventListener('controllerchange', reloadRequestedUpdate)
    }
  }, [])

  async function install() {
    if (!installEvent) return
    try {
      await installEvent.prompt()
      await installEvent.userChoice
    } finally { setInstallEvent(null) }
  }

  return {
    online, installed, canInstall: Boolean(installEvent), install,
    offlineReady: offlineReady || cached, registrationError, needRefresh,
    dismissUpdate: () => setNeedRefresh(false),
    update: async () => {
      updateRequested.current = true
      try { await updateServiceWorker(true) }
      catch (error) { updateRequested.current = false; throw error }
    },
  }
}
