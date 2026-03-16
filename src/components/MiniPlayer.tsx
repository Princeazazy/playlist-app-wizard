import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, RotateCcw, X } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { isNativeOrWebView } from '@/lib/platformDetect';
import { useResilientPlayback } from '@/hooks/useResilientPlayback';

interface MiniPlayerProps {
  channel: Channel;
  onExpand: () => void;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  connecting: {
    label: 'Connecting',
    className: 'bg-muted/80 text-foreground',
  },
  buffering: {
    label: 'Buffering',
    className: 'bg-accent/90 text-accent-foreground',
  },
  reconnecting: {
    label: 'Reconnecting',
    className: 'bg-primary/85 text-primary-foreground',
  },
  playing: {
    label: 'Live',
    className: 'bg-primary text-primary-foreground',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/90 text-destructive-foreground',
  },
  idle: {
    label: 'Idle',
    className: 'bg-muted text-foreground',
  },
};

export const MiniPlayer = ({ channel, onExpand, onClose }: MiniPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    playbackState,
    error,
    retryPlayback,
    retryCount,
  } = useResilientPlayback({
    videoRef,
    channel,
    forceMuted: false,
    maxReconnectCycles: 5,
    startupTimeoutMs: 9000,
    stalledThresholdMs: 12000,
    logPrefix: 'MiniPlayer',
  });

  const currentStatus = statusConfig[playbackState] ?? statusConfig.idle;
  const isRecovering = playbackState === 'buffering' || playbackState === 'reconnecting' || playbackState === 'connecting';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      drag
      dragMomentum={false}
      className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-border/40 bg-black cursor-move"
      style={{ aspectRatio: '16/9' }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        autoPlay
        muted
      />

      {channel.logo && (
        <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg bg-black/60 backdrop-blur-sm overflow-hidden border border-white/10">
          <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain p-1" />
        </div>
      )}

      <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide ${currentStatus.className}`}>
        {currentStatus.label}
      </div>

      {isRecovering && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-medium">
          {retryCount > 0 ? `Retry ${retryCount}` : 'Stabilizing'}
        </div>
      )}

      {playbackState === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85">
          <div className="text-center px-4">
            <p className="text-red-400 text-xs mb-3">{error ?? 'Failed to play stream'}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                retryPlayback();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between">
          <p className="text-white text-xs font-medium truncate flex-1 mr-2">{channel.name}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              retryPlayback();
            }}
            className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            title="Reload stream"
          >
            <RotateCcw className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
