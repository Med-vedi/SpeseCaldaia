import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface DraftModeContextType {
  isDraftMode: boolean
  setDraftMode: (enabled: boolean) => void
  toggleDraftMode: () => void
}

const STORAGE_KEY = 'spese-caldaia-draft-mode'

const DraftModeContext = createContext<DraftModeContextType | undefined>(undefined)

function readInitialDraftMode(): boolean {
  if (typeof window === 'undefined') return true
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === null) return true
  return saved === 'true'
}

export const DraftModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDraftMode, setIsDraftMode] = useState<boolean>(readInitialDraftMode)

  const setDraftMode = (enabled: boolean) => {
    setIsDraftMode(enabled)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(enabled))
    }
  }

  const toggleDraftMode = () => {
    setDraftMode(!isDraftMode)
  }

  const value = useMemo<DraftModeContextType>(
    () => ({
      isDraftMode,
      setDraftMode,
      toggleDraftMode,
    }),
    [isDraftMode]
  )

  return <DraftModeContext.Provider value={value}>{children}</DraftModeContext.Provider>
}

export const useDraftMode = () => {
  const context = useContext(DraftModeContext)
  if (!context) {
    throw new Error('useDraftMode must be used within a DraftModeProvider')
  }
  return context
}
