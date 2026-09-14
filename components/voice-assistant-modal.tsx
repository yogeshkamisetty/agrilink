'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Volume2, VolumeX, Sparkles, X, HelpCircle, ArrowRight } from 'lucide-react'

export interface VoiceAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  userRole?: string
}

type QuestionItem = {
  id: string
  role: 'Farmer' | 'Buyer' | 'All'
  prompt: string
  answer: string
  langPromptTe?: string
  langAnswerTe?: string
}

const FAQ_ITEMS: QuestionItem[] = [
  {
    id: 'f1',
    role: 'Farmer',
    prompt: 'How do I commit my upcoming harvest to an order?',
    answer: 'First declare your harvest: crop, kilos and when you start picking. Then open Buyer demands, choose an order for your crop and enter the kilos you can supply. The price is fixed on the order and is never below the mandi rate on the day it was placed.',
  },
  {
    id: 'f2',
    role: 'Farmer',
    prompt: 'When do I get paid?',
    answer: 'When your lot is weighed and accepted at collection, an advance on its value is paid from the buyer’s advance held in the FPO account. The balance follows after the buyer inspects the delivery, less your share of transport by weight. Each payment is sent to your phone as a message.',
  },
  {
    id: 'f3',
    role: 'Farmer',
    prompt: 'How does GradeCam quality checking work?',
    answer: 'Take a clear photo of a sample of your lot. The AI suggests a grade using AGMARK criteria and lists the defects it can see. The FPO coordinator makes the final decision at collection, and any change to the AI grade is recorded with a reason.',
  },
  {
    id: 'b1',
    role: 'Buyer',
    prompt: 'How do I place an order?',
    answer: 'Open the store, choose a crop, quantity, price and delivery date up to 60 days ahead. The price must be at least the mandi rate. Orders up to 50 kg go straight to the nearest farmer who can fill them; larger orders state a purpose, are reviewed by the FPO, and open to farmers once you commit the advance.',
  },
  {
    id: 'b2',
    role: 'Buyer',
    prompt: 'How are smallholders combined for a bulk order?',
    answer: 'Member farmers within 40 km whose harvest can reach you fresh commit until the order holds 115% of your quantity. The extra 15% is standby, promoted automatically if someone drops out. Transport is shared by weight across the collection run.',
  },
  {
    id: 'all1',
    role: 'All',
    prompt: 'What happens to excess or surplus harvest?',
    answer: 'Standby farmers who were not needed are told straight away so they can sell elsewhere. The demand forecast flags crops where registered supply runs ahead of expected demand, so the FPO can find household and society buyers before harvest.',
  },
]

export function VoiceAssistantModal({
  isOpen,
  onClose,
  userRole = 'Farmer',
}: VoiceAssistantModalProps) {
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem>(FAQ_ITEMS[0])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true)
    }
  }, [])

  useEffect(() => {
    // Select relevant question on open
    const relevant = FAQ_ITEMS.find((q) => q.role === userRole) || FAQ_ITEMS[0]
    setActiveQuestion(relevant)
  }, [userRole, isOpen])

  if (!isOpen) return null

  const handleSpeak = (text: string) => {
    if (!speechSupported) return
    window.speechSynthesis.cancel()

    if (isSpeaking) {
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const handleSelectQuestion = (item: QuestionItem) => {
    setActiveQuestion(item)
    handleSpeak(item.answer)
  }

  const handleClose = () => {
    if (speechSupported) window.speechSynthesis.cancel()
    setIsSpeaking(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <Card className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto border-primary/30 p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        <button
          onClick={handleClose}
          className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
          <div className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Mic className="size-4 sm:size-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-xs font-bold text-primary">BHASHINI VERNACULAR AI</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Voice Assistant
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
              Voice-Based Digital Assistant
            </h3>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Ask questions in your dialect. The voice assistant explains how to register, commit harvest, verify quality, and manage orders with zero technical jargon.
        </p>

        {/* Current Active Response Card */}
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4 relative">
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif text-sm font-bold text-foreground">
              &quot;{activeQuestion.prompt}&quot;
            </p>
            <button
              onClick={() => handleSpeak(activeQuestion.answer)}
              className={`shrink-0 rounded-xl p-2 transition-all min-h-[38px] min-w-[38px] flex items-center justify-center ${
                isSpeaking
                  ? 'bg-primary text-primary-foreground shadow-sm animate-pulse'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
              title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
            >
              {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>

          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {activeQuestion.answer}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] font-mono text-muted-foreground">
            <span>Audio synthesis: English · हिंदी · తెలుగు</span>
            <span className={isSpeaking ? 'text-primary font-bold animate-pulse' : ''}>
              {isSpeaking ? 'Speaking response…' : 'Tap speaker to hear'}
            </span>
          </div>
        </div>

        {/* Question Quick-Picks */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Frequently Asked by {userRole}s:</p>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {FAQ_ITEMS.map((item) => {
              const isSelected = activeQuestion.id === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectQuestion(item)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <span className="truncate pr-2">{item.prompt}</span>
                  <ArrowRight className="size-3.5 shrink-0 opacity-60" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <Button onClick={handleClose} size="sm" variant="secondary" className="min-h-[40px] w-full sm:w-auto">
            Close Assistant
          </Button>
        </div>
      </Card>
    </div>
  )
}
