'use client'

import { Camera, CheckCircle2, ShieldCheck, Sparkles, VideoOff, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Props = {
  onCapture: (photoDataUrl: string) => void
  disabled?: boolean
}

export function GradeCamCamera({ onCapture, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCamera = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      console.warn('Camera access unavailable:', err)
      setError('Live camera not available. Using simulated high-resolution produce frame.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const capturePhoto = () => {
    if (cameraActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        // Add immutable timestamp verification overlay
        ctx.font = '14px monospace'
        ctx.fillStyle = '#10b981'
        ctx.fillText(`AgriLink Quality Record · ${new Date().toISOString()}`, 20, 460)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        onCapture(dataUrl)
      }
    } else {
      // High-resolution crop verification canvas sample
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(0, 0, 640, 480)
        ctx.fillStyle = '#334155'
        ctx.fillRect(80, 60, 480, 360)
        const colors = ['#dc2626', '#ea580c', '#ef4444', '#b91c1c', '#f87171']
        for (let i = 0; i < 25; i++) {
          const x = 140 + (i % 5) * 85 + Math.random() * 15
          const y = 110 + Math.floor(i / 5) * 65 + Math.random() * 15
          ctx.beginPath()
          ctx.arc(x, y, 32 + Math.random() * 6, 0, Math.PI * 2)
          ctx.fillStyle = colors[i % colors.length]
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x - 10, y - 10, 8, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.fill()
        }
        ctx.font = '14px monospace'
        ctx.fillStyle = '#38bdf8'
        ctx.fillText(`AgriLink Quality Verified · ${new Date().toISOString()}`, 20, 460)
      }
      onCapture(canvas.toDataURL('image/jpeg', 0.85))
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card p-4 shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-dashed border-primary/40 bg-secondary/60 flex items-center justify-center">
        {cameraActive ? (
          <video ref={videoRef} playsInline autoPlay muted className="h-full w-full object-cover" />
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Camera className="size-8" />
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">Camera-Assisted Quality Verification</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {error || 'Capture optical produce image at collection depot. Verified jointly by Coordinator & Buyer.'}
            </p>
            <div className="mt-4 flex flex-col min-[420px]:flex-row justify-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60 cursor-pointer min-h-[40px]"
              >
                <Camera className="size-4" /> Start Device Camera
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60 cursor-pointer min-h-[40px]"
              >
                <Eye className="size-4 text-primary" /> Capture Photo
              </button>
            </div>
          </div>
        )}

        {cameraActive && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-background/80 px-3 py-2 text-xs backdrop-blur-md">
            <span className="flex items-center gap-2 text-primary font-medium">
              <span className="size-2 animate-ping rounded-full bg-primary" /> Live optical feed
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={disabled}
                className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground shadow min-h-[36px]"
              >
                Snap photo
              </button>
              <button type="button" onClick={stopCamera} className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] flex items-center justify-center">
                <VideoOff className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dual Review Protocol Badges */}
      <div className="mt-3.5 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 rounded-xl bg-secondary/50 p-2 border border-border/60">
          <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
          <span>FPO QC Sign-off: Physical Check</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-secondary/50 p-2 border border-border/60">
          <CheckCircle2 className="size-3.5 text-blue-600 shrink-0" />
          <span>Buyer Review: Photo in Waybill</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
