import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, Loader2, X, RefreshCw } from 'lucide-react';

interface CameraCaptureOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, latitude: string, longitude: string, locationName: string) => void;
  title?: string;
}

export const CameraCaptureOverlay: React.FC<CameraCaptureOverlayProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "Capture Verification Photo"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (isOpen) {
      startCameraAndLocation();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCameraAndLocation = async () => {
    setErrorMsg('');
    setIsLocating(true);

    // 1. Get Geolocation
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        
        try {
          // Reverse geocoding via OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            const addr = data.address;
            const parts = [
              addr.road || addr.suburb || addr.neighbourhood,
              addr.city || addr.town || addr.village,
              addr.state || addr.county
            ].filter(Boolean);
            setLocationName(parts.join(', ') || data.display_name || 'Delhi, India');
          } else {
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (e) {
          console.error("Geocoding failed:", e);
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Location error:", error);
        setErrorMsg("Location access is mandatory. Please enable location permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // 2. Start Camera
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setErrorMsg("Failed to open camera. Please ensure camera access is enabled.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !isCameraActive) return;
    if (!coords) {
      alert("Please wait for your GPS coordinates to load.");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file, coords.lat.toString(), coords.lng.toString(), locationName || "Unknown Address");
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001122]/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl relative border border-outline-variant/10 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-secondary" />
            {title}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:bg-surface-container transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Feed Box */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-outline-variant/20 flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
          />
          {!isCameraActive && (
            <div className="flex flex-col items-center gap-3 text-white/50 text-xs absolute inset-0 justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
              <p>Initializing camera feed...</p>
            </div>
          )}

          {/* Location indicator tag overlay */}
          <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/10 text-[10px] font-medium flex items-center gap-1.5">
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${coords ? 'text-green-400 animate-pulse' : 'text-yellow-400'}`} />
            <div className="truncate flex-1">
              {isLocating ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Resolving location...
                </span>
              ) : coords ? (
                <span>{locationName || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}</span>
              ) : (
                <span className="text-yellow-400">Waiting for location permission...</span>
              )}
            </div>
          </div>
        </div>

        {/* Errors message display */}
        {errorMsg && (
          <div className="mt-3 text-red-600 text-xs font-semibold text-center leading-relaxed max-w-xs bg-red-50 p-2.5 rounded-xl border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Capture Action Controls */}
        <div className="mt-5 flex gap-3 w-full shrink-0">
          <button
            type="button"
            onClick={toggleCamera}
            className="h-12 w-12 rounded-2xl border border-outline-variant/30 flex items-center justify-center text-outline hover:bg-surface-container active:scale-95 transition-all"
            title="Switch Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            type="button"
            disabled={!isCameraActive || !coords}
            onClick={handleCapture}
            className="flex-1 h-12 bg-primary disabled:bg-primary/40 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:scale-100 transition-all text-xs uppercase tracking-wider"
          >
            <Camera className="w-4 h-4" />
            Capture Photo
          </button>
        </div>
      </div>
    </div>
  );
};
