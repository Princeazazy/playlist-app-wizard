import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { AVATARS, getProfileAvatarId, setProfileAvatar, getProfileInitial } from '@/lib/profileStorage';

interface AvatarPickerProps {
  open: boolean;
  onClose: () => void;
  onChange?: () => void;
}

export const AvatarPicker = ({ open, onClose, onChange }: AvatarPickerProps) => {
  const [selected, setSelected] = useState<string | null>(getProfileAvatarId());
  if (!open) return null;

  const pick = (id: string | null) => {
    setSelected(id);
    setProfileAvatar(id);
    onChange?.();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border/50 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Choose your avatar</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {/* Initial fallback option */}
          <button
            onClick={() => pick(null)}
            className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all ${
              selected === null ? 'border-primary scale-105' : 'border-transparent hover:border-white/30'
            }`}
          >
            <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-2xl">{getProfileInitial()}</span>
            </div>
            {selected === null && (
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>

          {AVATARS.map((a) => {
            const isSel = selected === a.id;
            return (
              <button
                key={a.id}
                onClick={() => pick(a.id)}
                className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all bg-gradient-to-br from-primary/20 to-accent/20 ${
                  isSel ? 'border-primary scale-105' : 'border-transparent hover:border-white/30'
                }`}
                title={a.label}
              >
                <img src={a.src} alt={a.label} className="w-full h-full object-cover" loading="lazy" />
                {isSel && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-5">
          The first letter of your name is used if no avatar is selected.
        </p>
      </div>
    </div>
  );
};
