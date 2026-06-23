import { useRef, useState, useEffect } from "react";
import Button from "@/components/common/Button";
import SectionSubHeader from "@/components/common/SectionSubHeader";
import { useUploadAssetImageMutation } from "@/services/operations/assetsAPI";
import { Camera, Upload, ImageIcon, X, RotateCcw, Aperture } from "lucide-react";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetScanFormProps = {
    plantId: string;
    onSuccess?: () => void;
    close?: () => void;
};

function base64ToFile(base64: string, filename: string): File {
    const [header, data] = base64.split(",");
    const mimeMatch = header.match(/data:(.*);base64/);
    const mime = mimeMatch?.[1] || "image/jpeg";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
}

type Mode = "choice" | "camera" | "preview";

// ── Component ─────────────────────────────────────────────────────────────────

const AssetScanForm: React.FC<AssetScanFormProps> = ({
    plantId,
    onSuccess,
    close,
}) => {
    const [mode, setMode] = useState<Mode>("choice");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const deviceInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const uploadMutation = useUploadAssetImageMutation();

    // ── Camera lifecycle: starts/stops whenever `mode` flips to/from "camera" ──
    // (video element only exists in the DOM once mode === "camera", so the
    // stream must be attached AFTER that render, inside this effect — not
    // inside the button's onClick handler.)

    useEffect(() => {
        if (mode !== "camera") return;

        let cancelled = false;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch (err) {
                console.error("Camera error:", err);
                setCameraError("Could not access camera. Check permissions and try again.");
                toast.error("Could not access camera.");
                setMode("choice");
            }
        })();

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, [mode]);

    // ── Capture ────────────────────────────────────────────────────────────────

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPreviewUrl(dataUrl);
        setMode("preview"); // triggers camera cleanup via the effect above
    };

    const retakePhoto = () => {
        setPreviewUrl(null);
        setCameraError(null);
        setMode("camera"); // re-triggers the effect, restarting the stream
    };

    // ── Device upload ─────────────────────────────────────────────────────────

    const handleDeviceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        e.target.value = "";
        if (!selected || !selected.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") return;
            setPreviewUrl(result);
            setMode("preview");
        };
        reader.readAsDataURL(selected);
    };

    // ── Reset ──────────────────────────────────────────────────────────────────

    const clearSelection = () => {
        setPreviewUrl(null);
        setCameraError(null);
        setMode("choice"); // useEffect cleanup stops any active stream
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const onSubmit = () => {
        if (!previewUrl) return;

        const file = base64ToFile(previewUrl, `scan_${Date.now()}.jpg`);

        uploadMutation.mutate(
            { file, plantId },
            {
                onSuccess: () => {
                    clearSelection();
                    onSuccess?.();
                    close?.();
                },
            },
        );
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-full flex-col gap-2">
            <div className="space-y-2">
                <div className="space-y-2">
                    <SectionSubHeader icon={ImageIcon} title="Scan Asset" />

                    <div className="grid grid-cols-1 gap-2">
                        {mode === "choice" && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => deviceInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                                >
                                    <Upload className="h-6 w-6" />
                                    Upload from device
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("camera")}
                                    className="flex flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                                >
                                    <Camera className="h-6 w-6" />
                                    Use camera
                                </button>
                            </div>
                        )}

                        {mode === "camera" && (
                            <div className="space-y-2">
                                <div className="relative overflow-hidden rounded-xs border border-neutral-200 bg-black dark:border-neutral-dark-300">
                                    <video
                                        ref={videoRef}
                                        className="max-h-80 w-full object-contain"
                                        playsInline
                                        muted
                                        autoPlay
                                    />
                                </div>
                                {cameraError && (
                                    <p className="text-xs text-error-500">{cameraError}</p>
                                )}
                                <div className="flex justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        className="inline-flex items-center gap-1.5 rounded-xs border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        className="inline-flex items-center gap-1.5 rounded-xs bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
                                    >
                                        <Aperture className="h-3.5 w-3.5" />
                                        Capture
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === "preview" && previewUrl && (
                            <div className="space-y-2">
                                <div className="relative overflow-hidden rounded-xs border border-neutral-200 dark:border-neutral-dark-300">
                                    <img
                                        src={previewUrl}
                                        alt="Selected asset"
                                        className="max-h-80 w-full object-contain bg-neutral-50 dark:bg-neutral-dark-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        title="Remove image"
                                        aria-label="Remove image"
                                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900/70 text-white transition-colors hover:bg-neutral-900"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={retakePhoto}
                                        className="inline-flex items-center gap-1.5 rounded-xs border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-dark-300 dark:bg-neutral-dark-100 dark:text-neutral-dark-600"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Retake
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* hidden canvas used only for frame capture, never shown */}
            <canvas ref={canvasRef} className="hidden" />

            <input
                ref={deviceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                tabIndex={-1}
                aria-hidden
                onChange={handleDeviceChange}
            />

            <div className="flex justify-end z-20 mt-auto border-t border-neutral-200 bg-white/95 px-1 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-dark-200/95">
                <Button type="button" onClick={onSubmit} disabled={!previewUrl || uploadMutation.isPending}>
                    {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
            </div>
        </div>
    );
};

export default AssetScanForm;