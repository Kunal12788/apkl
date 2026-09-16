import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, Loader2, X, RefreshCw, Smartphone } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    // 1. Get Geolocation (graceful, non-blocking)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            if (response.ok) {
              const data = await response.json();
              const addr = data.address || {};
              const parts = [
                addr.road || addr.suburb || addr.neighbourhood,
                addr.city || addr.town || addr.village,
                addr.state || addr.county
              ].filter(Boolean);
              setLocationName(parts.join(', ') || data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            } else {
              setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }
          } catch (e) {
            console.warn("Geocoding failed:", e);
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.warn("Location error:", error);
          setLocationName("Location permission not granted");
          setIsLocating(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setLocationName("Geolocation unsupported");
      setIsLocating(false);
    }

    // 2. Start Camera (with multi-tier mobile fallbacks)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("WebRTC getUserMedia not available in this context (requires HTTPS on mobile).");
      setErrorMsg("Live camera requires HTTPS on mobile. Use 'Take Photo with Device Camera' below.");
      setIsCameraActive(false);
      return;
    }

    let mediaStream: MediaStream | null = null;
    const constraintList: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      {
        video: {
          facingMode: { ideal: facingMode }
        }
      },
      {
        video: true
      }
    ];

    for (const constraints of constraintList) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (mediaStream) break;
      } catch (e) {
        console.warn("Camera constraint attempt failed:", constraints, e);
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => console.warn("Video play error:", err));
        };
      }
      setIsCameraActive(true);
      setErrorMsg('');
    } else {
      setErrorMsg("Unable to access live camera stream. Tap 'Use Device Camera' below to take a photo directly.");
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

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const latStr = coords ? coords.lat.toString() : '0';
          const lngStr = coords ? coords.lng.toString() : '0';
          const locStr = locationName || (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Location recorded");
          onCapture(file, latStr, lngStr, locStr);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];

    const latStr = coords ? coords.lat.toString() : '0';
    const lngStr = coords ? coords.lng.toString() : '0';
    const locStr = locationName || (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Mobile device capture");

    onCapture(selectedFile, latStr, lngStr, locStr);
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001122]/85 backdrop-blur-md animate-fade-in">
      {/* Hidden native camera input fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeFileChange}
      />

      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl relative border border-outline-variant/10 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-secondary" />
            {title}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="w-7 h-7 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline hover:bg-surface-container transition-colors"
          >
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
            <div className="flex flex-col items-center gap-3 text-white/70 text-xs absolute inset-0 justify-center p-4 text-center">
              <Camera className="w-10 h-10 text-secondary opacity-75" />
              <p className="font-semibold text-white/90">
                {errorMsg ? "Live Stream Inactive" : "Initializing camera feed..."}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-secondary text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg hover:bg-secondary/90 active:scale-95 transition-all"
              >
                <Smartphone className="w-4 h-4" />
                Take Photo With Device Camera
              </button>
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
                <span className="text-yellow-400/90">{locationName || "GPS optional / resolving..."}</span>
              )}
            </div>
          </div>
        </div>

        {/* Error / Alert notice display */}
        {errorMsg && (
          <div className="mt-3 text-amber-800 text-[11px] font-medium text-center leading-relaxed max-w-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            {errorMsg}
          </div>
        )}

        {/* Capture Action Controls */}
        <div className="mt-5 flex gap-2 w-full shrink-0">
          {isCameraActive && (
            <button
              type="button"
              onClick={toggleCamera}
              className="h-12 w-12 rounded-2xl border border-outline-variant/30 flex items-center justify-center text-outline hover:bg-surface-container active:scale-95 transition-all shrink-0"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}

          {/* Primary Live Stream Capture (if camera active) */}
          {isCameraActive ? (
            <button
              type="button"
              onClick={handleCapture}
              className="flex-1 h-12 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
            >
              <Camera className="w-4 h-4" />
              Capture Photo
            </button>
          ) : null}

          {/* Mobile Native Device Camera Option (Always Available) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`${isCameraActive ? 'px-3 text-[11px]' : 'flex-1 text-xs'} h-12 bg-secondary text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-md hover:bg-secondary/90 active:scale-[0.98] transition-all uppercase tracking-wider`}
          >
            <Smartphone className="w-4 h-4" />
            {isCameraActive ? "Device Camera" : "Open Phone Camera"}
          </button>
        </div>
      </div>
    </div>
  );
};

