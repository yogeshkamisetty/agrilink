'use client'

import { Camera, RefreshCw, Sparkles, VideoOff } from 'lucide-react'
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
      setError('Live camera not available. Use simulate capture to test GradeCam AI.')
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        onCapture(dataUrl)
      }
    } else {
      // Simulate photo capture by drawing a realistic crop produce canvas sample
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Draw background
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(0, 0, 640, 480)
        // Draw produce crate box
        ctx.fillStyle = '#334155'
        ctx.fillRect(80, 60, 480, 360)
        // Draw sample tomatoes
        const colors = ['#dc2626', '#ea580c', '#ef4444', '#b91c1c', '#f87171']
        for (let i = 0; i < 25; i++) {
          const x = 140 + (i % 5) * 85 + Math.random() * 15
          const y = 110 + Math.floor(i / 5) * 65 + Math.random() * 15
          ctx.beginPath()
          ctx.arc(x, y, 32 + Math.random() * 6, 0, Math.PI * 2)
          ctx.fillStyle = colors[i % colors.length]
          ctx.fill()
          // Highlight
          ctx.beginPath()
          ctx.arc(x - 10, y - 10, 8, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.fill()
        }
        // Timestamp text
        ctx.font = '16px monospace'
        ctx.fillStyle = '#38bdf8'
        ctx.fillText(`AgriLink GradeCam · ${new Date().toISOString()}`, 20, 460)
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
            <p className="mt-4 text-sm font-semibold text-foreground">GradeCam Optical Scanner</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {error || 'Capture real produce photo at the FPO collection point.'}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                <Camera className="size-4" /> Start camera
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
              >
                <Sparkles className="size-4 text-primary" /> Capture lot photo
              </button>
            </div>
          </div>
        )}

        {cameraActive && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-background/80 px-3 py-2 text-xs backdrop-blur-md">
            <span className="flex items-center gap-2 text-primary font-medium">
              <span className="size-2 animate-ping rounded-full bg-primary" /> Live video stream
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={disabled}
                className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground shadow"
              >
                Snap photo
              </button>
              <button type="button" onClick={stopCamera} className="rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground">
                <VideoOff className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
