import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { AlertCircle, Camera, ScanLine, XCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  scanResult: { type: 'success' | 'error' | 'warning'; text: string } | null;
  setStartScanner: (fn: () => void) => void;
  setStopScanner: (fn: () => void) => void;
  setPauseScanner?: (fn: () => void) => void;
  setResumeScanner?: (fn: () => void) => void;
}

const scannerId = "qr-reader-container";

const QRScanner: React.FC<QRScannerProps> = ({ onScan, scanResult, setStartScanner, setStopScanner, setPauseScanner, setResumeScanner }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const getCameras = () => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        const backCamera = devices.find(device => device.label.toLowerCase().includes('back'));
        setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch((err: any) => {
      console.error("Error getting cameras:", err);
    });
  };

  useEffect(() => {
    getCameras();
  }, []);

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const startScanner = async () => {
    if (!selectedCameraId) {
      alert("No camera selected.");
      return;
    }

    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(scannerId, { verbose: false });
    }

    // Prevent starting if already scanning
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      return;
    }

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return { width: minEdge * 0.7, height: minEdge * 0.7 };
      },
    };

    try {
      await html5QrCodeRef.current.start(
        selectedCameraId,
        config,
        (decodedText: string) => {
            if (onScanRef.current) onScanRef.current(decodedText);
        },
        (errorMessage: string) => { /* Ignore errors */ }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error("Failed to start QR scanner", err);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (err: any) {
        console.error("Failed to stop QR scanner", err);
      }
    }
  };

  const pauseScanner = () => {
    if (html5QrCodeRef.current) {
      try { html5QrCodeRef.current.pause(true); } catch(e) { console.error("Failed to pause", e); }
    }
  };

  const resumeScanner = () => {
    if (html5QrCodeRef.current) {
      try { html5QrCodeRef.current.resume(); } catch(e) { console.error("Failed to resume", e); }
    }
  };

  // Expose start/stop functions to parent component
  useEffect(() => {
    setStartScanner(startScanner);
    setStopScanner(stopScanner);
    if (setPauseScanner) setPauseScanner(pauseScanner);
    if (setResumeScanner) setResumeScanner(resumeScanner);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Cleanup failed", err));
      }
    };
  }, []);

  return (
    <div className="bg-gfg-card-bg rounded-lg border border-gfg-border p-6">
      <h3 className="text-gfg-text-light font-bold text-lg mb-4 flex items-center font-heading uppercase tracking-wider">
        <ScanLine className="w-5 h-5 mr-2 text-gfg-gold" />
        Identity Scan      </h3>

      {!isScanning && cameras.length > 0 && (
        <div className="mb-4">
          <label htmlFor="camera-select" className="block text-sm font-body font-medium text-gfg-text-dark mb-2">Select Camera</label>
          <div className="flex gap-2">
            <select
              id="camera-select"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full px-3 py-2 bg-gfg-dark-bg border border-gfg-border rounded-lg text-gfg-text-light focus:border-gfg-gold focus:ring-1 focus:ring-gfg-gold outline-none"
            >
              {cameras.map((camera: CameraDevice) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
            <button onClick={getCameras} title="Refresh Camera List" className="p-2 bg-gfg-dark-bg border border-gfg-border rounded-lg text-gfg-gold hover:bg-gfg-border">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto p-1 bg-gfg-dark-bg rounded-lg shadow-inner">
        <div className="w-full aspect-square rounded overflow-hidden relative flex items-center justify-center">
          <div id={scannerId} className="w-full h-full"></div>
          {!isScanning && (
            <div className="absolute inset-0 bg-gfg-dark-bg/80 flex flex-col items-center justify-center p-4">
              <Camera className="w-16 h-16 text-gfg-gold mb-4" />
              <p className="text-gfg-text-light text-center font-body">
                Select a camera and start scanning.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="w-full flex items-center justify-center gap-2 bg-gfg-gold hover:bg-gfg-gold-hover text-gfg-card-bg py-3 px-4 rounded-lg font-bold font-heading uppercase tracking-widest transition-all disabled:opacity-50"
            disabled={!selectedCameraId}
          >
            <Camera className="w-5 h-5" />
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="w-full flex items-center justify-center gap-2 bg-gfg-red hover:bg-gfg-red-hover text-gfg-text-light py-3 px-4 rounded-lg font-bold font-heading uppercase tracking-widest transition-all"
          >
            <XCircle className="w-5 h-5" />
            Stop Scanner
          </button>
        )}
      </div>

      {scanResult && (
        <div className={`mt-4 flex items-start space-x-2 p-3 rounded-lg border ${scanResult.type === 'success' ? 'text-green-400 bg-green-500/10 border-green-500/20'
            : scanResult.type === 'warning' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
              : 'text-gfg-gold bg-gfg-gold/10 border-gfg-gold/20'
          }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-body">{scanResult.text}</span>
        </div>
      )}
    </div>
  );
};

export default QRScanner;