import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertTriangle, X, MapPin, UploadCloud, Smartphone } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { triggerAppleToast } from './AppleToast';

interface EODTallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  expected: {
    closingCash: number;
    closingPureGold: number;
    closingPureSilver: number;
    impureGoldRecv: number;
    openingCash: number;
    openingPureGold: number;
    openingPureSilver: number;
    cashReceived: number;
    cashUsed: number;
    goldUsed: number;
    silverUsed: number;
    impureSilverRecv: number;
  };
  branchName: string;
  branchId: string;
  userId: string;
  onSuccess: () => void;
}

type PhotoType = 'pure_gold' | 'impure_gold' | 'cash';

export const EODTallyModal: React.FC<EODTallyModalProps> = ({
  isOpen,
  onClose,
  expected,
  branchName,
  branchId,
  userId,
  onSuccess
}) => {
  // Stage 1: Physical Tally Input
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [physicalPureGold, setPhysicalPureGold] = useState<string>('');
  const [physicalImpureGold, setPhysicalImpureGold] = useState<string>('');
  const [discrepancyNote, setDiscrepancyNote] = useState<string>('');

  // Stage 2: Camera Capture
  const [activePhotoStep, setActivePhotoStep] = useState<PhotoType | null>(null);
  const [pureGoldPhoto, setPureGoldPhoto] = useState<string | null>(null);
  const [impureGoldPhoto, setImpureGoldPhoto] = useState<string | null>(null);
  const [cashPhoto, setCashPhoto] = useState<string | null>(null);

  // Camera stream & GPS states
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize input fields with expected on first open
  useEffect(() => {
    if (isOpen) {
      setPhysicalCash(expected.closingCash.toString());
      setPhysicalPureGold(expected.closingPureGold.toFixed(3));
      setPhysicalImpureGold(expected.impureGoldRecv.toFixed(3));
      setDiscrepancyNote('');
      setPureGoldPhoto(null);
      setImpureGoldPhoto(null);
      setCashPhoto(null);
      setActivePhotoStep(null);
      fetchLiveLocation();
    }
  }, [isOpen]);

  const fetchLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationName('Geolocation unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            const parts = [
              addr.road || addr.suburb || addr.neighbourhood,
              addr.city || addr.town || addr.village,
              addr.state
            ].filter(Boolean);
            setLocationName(parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      },
      () => setLocationName('Location access denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Camera Management
  const startCamera = async (photoType: PhotoType) => {
    setActivePhotoStep(photoType);
    
    // Check if getUserMedia is supported in this context (requires HTTPS on mobile Chrome)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('WebRTC getUserMedia not available on mobile HTTP');
      triggerAppleToast('Notice', 'Live feed requires HTTPS on mobile. Use "Open Phone Camera" below.', 'logout');
      return;
    }

    let mediaStream: MediaStream | null = null;
    const constraintList: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      {
        video: {
          facingMode: { ideal: 'environment' }
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
      } catch (err) {
        console.warn('Camera constraint attempt failed:', constraints, err);
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn("Video play error:", e));
        };
      }
    } else {
      triggerAppleToast('Live Feed Unavailable', 'Please tap "Open Phone Camera" below to take the photo.', 'logout');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setActivePhotoStep(null);
  };

  // Capture with embedded watermark (from live video feed)
  const handleSnapPhoto = () => {
    if (!videoRef.current || !activePhotoStep) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark Overlay Banner
    const bannerHeight = Math.max(90, Math.round(canvas.height * 0.12));
    ctx.fillStyle = 'rgba(0, 20, 40, 0.85)';
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

    // Watermark Text
    const label = 
      activePhotoStep === 'pure_gold' ? '🟡 PHYSICAL PURE GOLD STOCK' :
      activePhotoStep === 'impure_gold' ? '🟠 PHYSICAL IMPURE GOLD STOCK' : '🟢 PHYSICAL CASH DRAWER STOCK';

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(18, Math.round(bannerHeight * 0.25))}px Arial, sans-serif`;
    ctx.fillText(`${label} — ${branchName}`, 24, canvas.height - (bannerHeight * 0.55));

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${Math.max(13, Math.round(bannerHeight * 0.18))}px Arial, sans-serif`;
    const timeStr = new Date().toLocaleString('en-IN');
    ctx.fillText(`📅 ${timeStr}   📍 ${locationName} (${coords?.lat ? coords.lat.toFixed(4) : '0'}, ${coords?.lng ? coords.lng.toFixed(4) : '0'})`, 24, canvas.height - (bannerHeight * 0.2));

    // Get Data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (activePhotoStep === 'pure_gold') setPureGoldPhoto(photoDataUrl);
    if (activePhotoStep === 'impure_gold') setImpureGoldPhoto(photoDataUrl);
    if (activePhotoStep === 'cash') setCashPhoto(photoDataUrl);

    stopCamera();
    setIsCapturing(false);
    triggerAppleToast('Photo Verified', `${label} captured with GPS watermark!`, 'login');
  };

  // Fallback native photo capture directly from mobile camera app
  const handleNativePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoStep) return;
    setIsCapturing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1280;
        canvas.height = img.height || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsCapturing(false);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Watermark Overlay Banner
        const bannerHeight = Math.max(90, Math.round(canvas.height * 0.12));
        ctx.fillStyle = 'rgba(0, 20, 40, 0.85)';
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

        const label = 
          activePhotoStep === 'pure_gold' ? '🟡 PHYSICAL PURE GOLD STOCK' :
          activePhotoStep === 'impure_gold' ? '🟠 PHYSICAL IMPURE GOLD STOCK' : '🟢 PHYSICAL CASH DRAWER STOCK';

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(18, Math.round(bannerHeight * 0.25))}px Arial, sans-serif`;
        ctx.fillText(`${label} — ${branchName}`, 24, canvas.height - (bannerHeight * 0.55));

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `${Math.max(13, Math.round(bannerHeight * 0.18))}px Arial, sans-serif`;
        const timeStr = new Date().toLocaleString('en-IN');
        ctx.fillText(`📅 ${timeStr}   📍 ${locationName} (${coords?.lat ? coords.lat.toFixed(4) : '0'}, ${coords?.lng ? coords.lng.toFixed(4) : '0'})`, 24, canvas.height - (bannerHeight * 0.2));

        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        if (activePhotoStep === 'pure_gold') setPureGoldPhoto(photoDataUrl);
        if (activePhotoStep === 'impure_gold') setImpureGoldPhoto(photoDataUrl);
        if (activePhotoStep === 'cash') setCashPhoto(photoDataUrl);

        stopCamera();
        setIsCapturing(false);
        triggerAppleToast('Photo Verified', `${label} captured with GPS watermark!`, 'login');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  // Variances
  const pCash = Number(physicalCash) || 0;
  const pGold = Number(physicalPureGold) || 0;
  const pImpure = Number(physicalImpureGold) || 0;

  const cashDiff = pCash - expected.closingCash;
  const goldDiff = pGold - expected.closingPureGold;
  const impureDiff = pImpure - expected.impureGoldRecv;

  const hasMismatch = Math.abs(cashDiff) > 1 || Math.abs(goldDiff) > 0.005 || Math.abs(impureDiff) > 0.005;
  const allPhotosCaptured = !!pureGoldPhoto && !!impureGoldPhoto && !!cashPhoto;

  // Upload helper for base64
  const uploadPhotoToSupabase = async (base64: string, name: string) => {
    try {
      const res = await fetch(base64);
      const blob = await res.blob();
      const fileName = `eod_${branchId}_${name}_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('task_images').upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
      if (error) {
        console.warn('Storage upload error, using raw URL:', error);
        return base64; // Fallback to inline
      }
      const { data: { publicUrl } } = supabase.storage.from('task_images').getPublicUrl(fileName);
      return publicUrl || base64;
    } catch {
      return base64;
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    if (hasMismatch && !discrepancyNote.trim()) {
      triggerAppleToast('Explanation Required', 'Please provide a discrepancy note explaining the variance.', 'logout');
      return;
    }

    if (!allPhotosCaptured) {
      triggerAppleToast('Photos Missing', 'Please take all 3 mandatory live photos to proceed.', 'logout');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload photos
      const [pureUrl, impureUrl, cashUrl] = await Promise.all([
        uploadPhotoToSupabase(pureGoldPhoto!, 'pure_gold'),
        uploadPhotoToSupabase(impureGoldPhoto!, 'impure_gold'),
        uploadPhotoToSupabase(cashPhoto!, 'cash')
      ]);

      const today = new Date().toISOString().split('T')[0];
      const validBranchId = branchId?.includes('-') ? branchId : 'a3fa8cbc-25f8-4af6-bd86-66e8ae1da904';

      // 2. Insert into branch_daily_reports
      const { error } = await supabase.from('branch_daily_reports').insert([{
        id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        branch_id: validBranchId,
        branch_name: branchName,
        staff_id: userId,
        date: 'Today',
        iso_date: today,
        opening_pure_gold: expected.openingPureGold,
        opening_pure_silver: expected.openingPureSilver,
        opening_cash: expected.openingCash,
        gold_used: expected.goldUsed,
        silver_used: expected.silverUsed,
        cash_used: expected.cashUsed,
        cash_received: expected.cashReceived,
        impure_gold_received: expected.impureSilverRecv,
        closing_pure_gold: expected.closingPureGold,
        closing_pure_silver: expected.closingPureSilver,
        closing_cash: expected.closingCash,

        // New Verified Fields
        physical_closing_cash: pCash,
        physical_closing_gold: pGold,
        physical_closing_impure_gold: pImpure,
        cash_discrepancy: cashDiff,
        gold_discrepancy: goldDiff,
        impure_gold_discrepancy: impureDiff,
        discrepancy_note: discrepancyNote || null,

        pure_gold_photo_url: pureUrl,
        impure_gold_photo_url: impureUrl,
        cash_photo_url: cashUrl,
        latitude: coords?.lat?.toString() || null,
        longitude: coords?.lng?.toString() || null,
        location_name: locationName,
        status: 'Submitted'
      }]);

      if (error) throw error;

      triggerAppleToast('Report Submitted', 'Daily report and 3-photo vault verification submitted!', 'login');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Final EOD error:', err);
      triggerAppleToast('Submission Failed', err.message || 'Failed to submit report', 'logout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl p-5 sm:p-7 my-auto animate-scale-up">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute top-4 right-4 p-2 text-outline hover:text-on-surface rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Camera View Overlay if active */}
        {activePhotoStep ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-primary">
                  Live Camera: {
                    activePhotoStep === 'pure_gold' ? 'Pure Gold Stock' :
                    activePhotoStep === 'impure_gold' ? 'Impure Gold Stock' : 'Physical Cash Stock'
                  }
                </h3>
              </div>
              <button
                onClick={stopCamera}
                className="text-xs font-bold text-outline hover:text-on-surface"
              >
                Cancel Camera
              </button>
            </div>

            {/* Hidden native mobile camera input */}
            <input
              ref={nativeInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNativePhotoUpload}
            />

            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${stream ? 'block' : 'hidden'}`} />
              
              {!stream && (
                <div className="flex flex-col items-center gap-2 text-white/70 text-xs p-4 text-center">
                  <Camera className="w-8 h-8 text-amber-400 opacity-80" />
                  <p className="font-semibold text-white/90">Live Feed Not Active</p>
                  <button
                    type="button"
                    onClick={() => nativeInputRef.current?.click()}
                    className="mt-1 px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    Open Phone Camera
                  </button>
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 p-2 bg-black/70 backdrop-blur-sm rounded-xl text-white text-[11px] flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{locationName}</span>
                </div>
                <span className="text-amber-300 font-mono text-[10px] shrink-0 font-bold">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-outline font-medium">
              ⚠️ Live camera or device camera only. Photo will be permanently stamped with GPS and timestamp.
            </p>

            <div className="flex gap-2 w-full">
              {stream && (
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  disabled={isCapturing}
                  className="flex-1 py-3.5 button-gradient text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {isCapturing ? 'Stamping Watermark...' : 'Snap & Verify'}
                </button>
              )}

              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                disabled={isCapturing}
                className={`${stream ? 'px-4 text-xs' : 'flex-1 text-xs sm:text-sm py-3.5'} bg-secondary text-white rounded-2xl font-bold shadow-md flex items-center justify-center gap-2 hover:bg-secondary/90 active:scale-95 transition-all`}
              >
                <Smartphone className="w-4 h-4" />
                {stream ? 'Phone Camera' : 'Open Phone Camera'}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Reconciliation Flow */
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                  Step 1 of 2: Physical Tally
                </span>
                <span className="text-xs text-outline font-medium">• {branchName}</span>
              </div>
              <h2 className="text-xl font-bold text-primary">End-of-Day Safe & Cash Reconciliation</h2>
              <p className="text-xs text-outline mt-0.5">
                Compare physical safe counts against system figures. Any discrepancy requires an explanation.
              </p>
            </div>

            {/* Reconciliation Comparison Table */}
            <div className="border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-surface-container-highest text-outline text-[10px] font-bold uppercase tracking-wider border-b border-outline-variant/20">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Asset</th>
                    <th className="py-2.5 px-3 text-right">System Expected</th>
                    <th className="py-2.5 px-3 text-right">Physical Count</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {/* Cash */}
                  <tr className="hover:bg-surface-container-highest/20">
                    <td className="py-2 px-3 font-bold text-on-surface">Physical Cash (₹)</td>
                    <td className="py-2 px-3 text-right font-mono text-outline">₹{expected.closingCash.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        value={physicalCash}
                        onChange={e => setPhysicalCash(e.target.value)}
                        className="w-28 px-2 py-1 text-right font-mono font-bold bg-white border border-outline-variant/30 rounded-lg text-xs focus:border-primary outline-none"
                      />
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${cashDiff === 0 ? 'text-emerald-600' : 'text-error'}`}>
                      {cashDiff === 0 ? '✓ Matched' : (cashDiff > 0 ? `+₹${cashDiff}` : `-₹${Math.abs(cashDiff)}`)}
                    </td>
                  </tr>

                  {/* Pure Gold */}
                  <tr className="hover:bg-surface-container-highest/20">
                    <td className="py-2 px-3 font-bold text-on-surface">Pure Gold (g)</td>
                    <td className="py-2 px-3 text-right font-mono text-outline">{expected.closingPureGold.toFixed(3)}g</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.001"
                        value={physicalPureGold}
                        onChange={e => setPhysicalPureGold(e.target.value)}
                        className="w-28 px-2 py-1 text-right font-mono font-bold bg-white border border-outline-variant/30 rounded-lg text-xs focus:border-primary outline-none"
                      />
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${Math.abs(goldDiff) < 0.001 ? 'text-emerald-600' : 'text-error'}`}>
                      {Math.abs(goldDiff) < 0.001 ? '✓ Matched' : (goldDiff > 0 ? `+${goldDiff.toFixed(3)}g` : `${goldDiff.toFixed(3)}g`)}
                    </td>
                  </tr>

                  {/* Impure Gold */}
                  <tr className="hover:bg-surface-container-highest/20">
                    <td className="py-2 px-3 font-bold text-on-surface">Impure Gold Scrap (g)</td>
                    <td className="py-2 px-3 text-right font-mono text-outline">{expected.impureGoldRecv.toFixed(3)}g</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.001"
                        value={physicalImpureGold}
                        onChange={e => setPhysicalImpureGold(e.target.value)}
                        className="w-28 px-2 py-1 text-right font-mono font-bold bg-white border border-outline-variant/30 rounded-lg text-xs focus:border-primary outline-none"
                      />
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${Math.abs(impureDiff) < 0.001 ? 'text-emerald-600' : 'text-error'}`}>
                      {Math.abs(impureDiff) < 0.001 ? '✓ Matched' : (impureDiff > 0 ? `+${impureDiff.toFixed(3)}g` : `${impureDiff.toFixed(3)}g`)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mismatch Warning Alert */}
            {hasMismatch && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-2xl text-error text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Physical Tally Discrepancy Detected!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-error/90">
                  The physical safe count does not match the system. A detailed explanation note is required for the Super Admin audit.
                </p>
                <textarea
                  rows={2}
                  value={discrepancyNote}
                  onChange={e => setDiscrepancyNote(e.target.value)}
                  placeholder="Explain the discrepancy reasons here (e.g. ₹500 cash round-off or pending scale calibration)..."
                  className="w-full p-2.5 bg-white border border-error/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-error"
                />
              </div>
            )}

            {/* Step 2: 3 Mandatory Photos Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Step 2: 3 Mandatory Live Verification Photos
                </label>
                <span className="text-[10px] text-outline font-semibold">
                  {[pureGoldPhoto, impureGoldPhoto, cashPhoto].filter(Boolean).length} of 3 Captured
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Photo 1: Pure Gold */}
                <div className="p-3 bg-surface-container-highest/30 border border-outline-variant/20 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-amber-800 mb-1.5">1. Pure Gold</span>
                  {pureGoldPhoto ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-emerald-500/50 mb-2">
                      <img src={pureGoldPhoto} alt="Pure Gold" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-white border border-dashed border-outline-variant/40 rounded-xl flex items-center justify-center text-outline mb-2">
                      <Camera className="w-5 h-5 text-amber-500/60" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => startCamera('pure_gold')}
                    className="w-full py-1.5 text-[10px] font-bold bg-white border border-outline-variant/30 hover:bg-amber-50 rounded-lg text-primary transition-colors"
                  >
                    {pureGoldPhoto ? 'Retake Photo' : 'Click Live Photo'}
                  </button>
                </div>

                {/* Photo 2: Impure Gold */}
                <div className="p-3 bg-surface-container-highest/30 border border-outline-variant/20 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-orange-800 mb-1.5">2. Impure Gold</span>
                  {impureGoldPhoto ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-emerald-500/50 mb-2">
                      <img src={impureGoldPhoto} alt="Impure Gold" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-white border border-dashed border-outline-variant/40 rounded-xl flex items-center justify-center text-outline mb-2">
                      <Camera className="w-5 h-5 text-orange-500/60" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => startCamera('impure_gold')}
                    className="w-full py-1.5 text-[10px] font-bold bg-white border border-outline-variant/30 hover:bg-orange-50 rounded-lg text-primary transition-colors"
                  >
                    {impureGoldPhoto ? 'Retake Photo' : 'Click Live Photo'}
                  </button>
                </div>

                {/* Photo 3: Cash Stock */}
                <div className="p-3 bg-surface-container-highest/30 border border-outline-variant/20 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-emerald-800 mb-1.5">3. Cash Stock</span>
                  {cashPhoto ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-emerald-500/50 mb-2">
                      <img src={cashPhoto} alt="Cash Stock" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-white border border-dashed border-outline-variant/40 rounded-xl flex items-center justify-center text-outline mb-2">
                      <Camera className="w-5 h-5 text-emerald-500/60" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => startCamera('cash')}
                    className="w-full py-1.5 text-[10px] font-bold bg-white border border-outline-variant/30 hover:bg-emerald-50 rounded-lg text-primary transition-colors"
                  >
                    {cashPhoto ? 'Retake Photo' : 'Click Live Photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-outline-variant/30 text-outline text-xs font-bold hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || !allPhotosCaptured || (hasMismatch && !discrepancyNote.trim())}
                className="flex-2 py-3 px-6 rounded-xl button-gradient text-white text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Submitting Verification...'
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Finalize & Submit Daily Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
