import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { storage, storageKeys } from '../lib/storage'
import { enUS } from './en-US'
import { type TranslationKeys, zhCN } from './zh-CN'

export type Language = 'zh-CN' | 'en-US'

const translations: Record<Language, TranslationKeys> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

function getNestedValue(obj: unknown, path: string): string {
  let current: unknown = obj
  for (const part of path.split('.')) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'zh-CN'
  const saved = storage.getItem(storageKeys.language) as Language | null
  if (saved && saved in translations) return saved
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    storage.setItem(storageKeys.language, language)
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]
    const value = getNestedValue(translation, key)
    if (typeof value !== 'string') return key
    return interpolate(value, params)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
