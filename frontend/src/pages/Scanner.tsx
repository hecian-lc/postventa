import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, X, Camera } from 'lucide-react'

export default function Scanner() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  async function startScanner() {
    setError('')
    setScanning(true)
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          stopScanner()
          // Extract OT ID from URL like http://...../ots/123
          const match = decoded.match(/\/ots\/(\d+)/)
          if (match) {
            navigate(`/ots/${match[1]}`)
          } else {
            setError(`QR no reconocido: ${decoded}`)
          }
        },
        undefined
      )
    } catch (err: unknown) {
      setScanning(false)
      setError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara')
    }
  }

  async function stopScanner() {
    if (scannerRef.current?.isScanning) {
      // Si ya se había detenido (o la cámara se cerró sola), no hay nada que hacer.
      try { await scannerRef.current.stop() } catch { /* ya detenido */ }
    }
    scannerRef.current = null
    setScanning(false)
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Escanear QR</h1>
        <p className="text-sm text-gray-500 mt-1">Apunta la cámara al código QR del equipo para ver su ficha</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {scanning ? (
          <div>
            <div id="qr-reader" className="rounded-lg overflow-hidden" />
            <button
              onClick={stopScanner}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50"
            >
              <X className="w-4 h-4" /> Detener escáner
            </button>
          </div>
        ) : (
          <button
            onClick={startScanner}
            className="w-full flex flex-col items-center gap-3 py-12 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          >
            <Camera className="w-10 h-10 text-gray-300 group-hover:text-blue-400 transition-colors" />
            <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Activar cámara</span>
          </button>
        )}
        {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">Cómo usar:</p>
        <p>1. Presiona "Activar cámara" y permite el acceso</p>
        <p>2. Apunta al código QR del equipo</p>
        <p>3. El sistema abrirá automáticamente la ficha</p>
      </div>
    </div>
  )
}
