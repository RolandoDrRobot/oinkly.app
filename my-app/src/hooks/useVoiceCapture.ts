/**
 * Hook reutilizable para captura de voz con Web Speech API.
 * Expone estado de escucha, transcripción en vivo y callbacks para inicio/fin.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

/** Web Speech API no está en los tipos estándar del DOM; definimos lo que usamos. */
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => unknown) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventLike) => unknown) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => unknown) | null;
}

interface SpeechRecognitionEventLike {
  results: { length: number; [i: number]: { 0: { transcript: string }; isFinal: boolean; length: number } };
  resultIndex: number;
}

interface UseVoiceCaptureOptions {
  /** Código de idioma (ej. 'es-ES', 'en-US') */
  lang: string;
  /** Si true, no se corta al hacer pausa; el usuario debe pulsar parar */
  continuous?: boolean;
  /** Si true, devuelve resultados intermedios mientras habla */
  interimResults?: boolean;
  /** Se llama con el texto final cuando el usuario para de grabar */
  onFinalTranscript?: (text: string) => void;
}

export interface UseVoiceCaptureReturn {
  isListening: boolean;
  /** Transcripción en vivo (intermedia o final según interimResults) */
  transcript: string;
  /** true si el navegador soporta reconocimiento de voz */
  supported: boolean;
  startListening: () => void;
  stopListening: () => void;
  /** Limpia la transcripción manualmente */
  clearTranscript: () => void;
}

export function useVoiceCapture(options: UseVoiceCaptureOptions): UseVoiceCaptureReturn {
  const { lang, continuous = true, interimResults = true, onFinalTranscript } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      finalTranscriptRef.current = '';
      setTranscript('');
      recognitionRef.current.start();
    } catch (err) {
      console.error('[useVoiceCapture] start error:', err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    try {
      recognitionRef.current.stop();
      const text = finalTranscriptRef.current.trim();
      if (text && onFinalTranscript) onFinalTranscript(text);
    } catch (err) {
      console.error('[useVoiceCapture] stop error:', err);
    }
  }, [isListening, onFinalTranscript]);

  useEffect(() => {
    const SpeechRecognitionAPI = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognitionAPI) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
      finalTranscriptRef.current = '';
      setTranscript('');
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
        if (i < event.results.length - 1) full += ' ';
        if (event.results[i].isFinal) {
          finalTranscriptRef.current = full;
        }
      }
      setTranscript(full);
    };

    recognition.onerror = (event: Event & { error?: string }) => {
      console.error('[useVoiceCapture] recognition error:', (event as any)?.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      recognitionRef.current = null;
    };
  }, [lang, continuous, interimResults]);

  return {
    isListening,
    transcript,
    supported,
    startListening,
    stopListening,
    clearTranscript,
  };
}
