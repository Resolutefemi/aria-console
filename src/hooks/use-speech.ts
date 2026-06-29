'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type RecognitionState = 'idle' | 'listening' | 'processing'

type UseSpeechRecognitionOptions = {
  continuous?: boolean
  interimResults?: boolean
  lang?: string
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

/**
 * Real speech recognition using the Web Speech API.
 * Supported in Chrome, Edge, Safari (iOS 14.5+). Not Firefox.
 *
 * Returns:
 * - state: 'idle' | 'listening' | 'processing'
 * - transcript: the recognized text so far
 * - isSupported: whether the browser supports speech recognition
 * - start: begin listening
 * - stop: stop listening
 * - reset: clear the transcript
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    continuous = false,
    interimResults = true,
    lang = 'en-US',
    onResult,
    onError,
    onEnd,
  } = options

  const [state, setState] = useState<RecognitionState>('idle')
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
    onEndRef.current = onEnd
  })

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)

    if (!SpeechRecognition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSupported(false)
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(true)

    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = lang

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      if (final) {
        setTranscript(final)
        onResultRef.current?.(final, true)
      } else if (interim) {
        setTranscript(interim)
        onResultRef.current?.(interim, false)
      }
    }

    recognition.onerror = (event: any) => {
      setState('idle')
      const errorMsg = event.error === 'no-speech'
        ? 'No speech detected'
        : event.error === 'not-allowed'
        ? 'Microphone permission denied'
        : event.error
      onErrorRef.current?.(errorMsg)
    }

    recognition.onend = () => {
      setState('idle')
      onEndRef.current?.()
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [continuous, interimResults, lang])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    try {
      recognitionRef.current.start()
      setState('listening')
    } catch (e) {
      // Already started — restart
      try {
        recognitionRef.current.stop()
        setTimeout(() => {
          recognitionRef.current?.start()
          setState('listening')
        }, 100)
      } catch {}
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
      setState('idle')
    } catch {}
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    state,
    transcript,
    isSupported,
    start,
    stop,
    reset,
  }
}

/**
 * Text-to-speech using the SpeechSynthesis API.
 * Works in all modern browsers.
 *
 * Returns:
 * - speak: function to speak text
 * - cancel: stop speaking
 * - speaking: whether speech is in progress
 * - isSupported: whether TTS is available
 * - voices: available voices
 */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSupported(false)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(true)

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices()
      setVoices(v)
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback((text: string, options?: {
    rate?: number
    pitch?: number
    volume?: number
    voice?: SpeechSynthesisVoice
    onEnd?: () => void
  }) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options?.rate ?? 1
    utterance.pitch = options?.pitch ?? 1
    utterance.volume = options?.volume ?? 1
    if (options?.voice) {
      utterance.voice = options.voice
    } else {
      // Prefer a natural-sounding English voice
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
      )
      if (preferred) utterance.voice = preferred
    }

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      setSpeaking(false)
      options?.onEnd?.()
    }
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [voices])

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [])

  return { speak, cancel, speaking, isSupported, voices }
}
