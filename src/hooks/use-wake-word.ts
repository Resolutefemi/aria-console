'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type WakeState = 'inactive' | 'armed' | 'listening-wake' | 'hearing-command' | 'processing' | 'speaking'

type UseWakeWordOptions = {
  wakeWord?: string                                  // default: 'hey aria'
  onCommand?: (transcript: string) => void           // called when a command is recognized after wake word
  onWakeWordDetected?: () => void                    // called when wake word is heard
  onError?: (error: string) => void
  lang?: string
}

/**
 * Wake word detection hook.
 *
 * Flow:
 * 1. User calls arm() once (required by browsers — needs a click)
 * 2. Recognition runs continuously, listening for the wake word
 * 3. When wake word is detected, switches to command mode
 * 4. After the user speaks their command, onCommand is called
 * 5. After the command is processed, returns to wake word listening
 *
 * State machine:
 * inactive → armed → listening-wake → hearing-command → processing → listening-wake
 *
 * The wake word is matched loosely — "hey aria", "aria", "ok aria", "hello aria"
 * all work. The command is the text AFTER the wake word.
 */
export function useWakeWord(options: UseWakeWordOptions = {}) {
  const {
    wakeWord = 'hey aria',
    onCommand,
    onWakeWordDetected,
    onError,
    lang = 'en-US',
  } = options

  const [state, setState] = useState<WakeState>('inactive')
  const [isSupported, setIsSupported] = useState(false)
  const [lastTranscript, setLastTranscript] = useState('')
  const [lastWakeWordTime, setLastWakeWordTime] = useState<number | null>(null)

  const recognitionRef = useRef<any>(null)
  const onCommandRef = useRef(onCommand)
  const onWakeWordDetectedRef = useRef(onWakeWordDetected)
  const onErrorRef = useRef(onError)
  const stateRef = useRef<WakeState>('inactive')
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onCommandRef.current = onCommand
    onWakeWordDetectedRef.current = onWakeWordDetected
    onErrorRef.current = onError
  })

  useEffect(() => { stateRef.current = state }, [state])

  // Build a regex that matches the wake word loosely
  // "hey aria" matches: "hey aria", "aria", "ok aria", "hello aria", "hi aria"
  const wakeRegex = useRef<RegExp>(new RegExp(`\\b(?:hey|ok|okay|hello|hi)?\\s*aria\\b`, 'i'))
  useEffect(() => {
    // Allow custom wake word — escape regex special chars
    const escaped = wakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    wakeRegex.current = new RegExp(`\\b(?:hey|ok|okay|hello|hi)?\\s*${escaped}\\b`, 'i')
  }, [wakeWord])

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }
    setIsSupported(true)

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
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

      const fullText = (final + ' ' + interim).trim()
      if (fullText) setLastTranscript(fullText)

      // Check for wake word in the current state
      if (stateRef.current === 'listening-wake') {
        const match = fullText.match(wakeRegex.current)
        if (match) {
          // Wake word detected!
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState('hearing-command')
          setLastWakeWordTime(Date.now())
          onWakeWordDetectedRef.current?.()

          // Check if the command was spoken in the same utterance
          // e.g. "Hey Aria, what's happening?" → command is "what's happening?"
          const afterWake = fullText.slice(match.index! + match[0].length).trim()
          if (afterWake.length > 3) {
            // Command was already spoken
            processCommandRef.current(afterWake)
          }
          return
        }
      } else if (stateRef.current === 'hearing-command') {
        // We're collecting the command after the wake word
        // Wait for a final result, or a pause in interim results
        if (final && final.length > 0) {
          // Strip the wake word if it's still in the final transcript
          let command = final
          const match = command.match(wakeRegex.current)
          if (match && match.index !== undefined && match.index < 10) {
            command = command.slice(match.index + match[0].length).trim()
          }
          if (command.length > 0) {
            processCommandRef.current(command)
          } else {
            // Just the wake word was spoken — wait for the command
            // Set a timeout: if no command in 5 seconds, go back to wake listening
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
            restartTimerRef.current = setTimeout(() => {
              if (stateRef.current === 'hearing-command') {
                onErrorRef.current?.('No command detected after wake word')
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setState('listening-wake')
              }
            }, 5000)
          }
        }
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      if (event.error === 'not-allowed') {
        onErrorRef.current?.('Microphone permission denied')
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState('inactive')
        return
      }
      onErrorRef.current?.(event.error)
    }

    recognition.onend = () => {
      // Auto-restart if we're supposed to be armed
      if (stateRef.current !== 'inactive' && stateRef.current !== 'processing' && stateRef.current !== 'speaking') {
        try {
          recognition.start()
        } catch {}
      }
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [lang, wakeWord])

  const processCommand = useCallback((transcript: string) => {
    setState('processing')
    onCommandRef.current?.(transcript.trim())
    // After processing, return to wake word listening
    // (the caller should call returnToListening() after speaking the response)
  }, [])

  // Keep a ref so the onresult handler (inside useEffect) can call it
  const processCommandRef = useRef(processCommand)
  useEffect(() => { processCommandRef.current = processCommand }, [processCommand])

  const arm = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setState('listening-wake')
    } catch {
      // Already running — restart
      try {
        recognitionRef.current.stop()
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
            setState('listening-wake')
          } catch {}
        }, 200)
      } catch {}
    }
  }, [])

  const disarm = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {}
    setState('inactive')
  }, [])

  const returnToListening = useCallback(() => {
    setState('listening-wake')
  }, [])

  const startSpeaking = useCallback(() => {
    setState('speaking')
  }, [])

  return {
    state,
    isSupported,
    lastTranscript,
    lastWakeWordTime,
    arm,
    disarm,
    returnToListening,
    startSpeaking,
  }
}
