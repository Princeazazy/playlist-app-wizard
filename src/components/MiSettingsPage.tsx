import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, User, Shield, ListVideo, Trash2, Cloud, Sun, CloudRain, Snowflake, CloudLightning, Check, X, Upload, FileVideo, Download, Loader2, Pencil } from 'lucide-react';
import { getProfileName, setProfileName, getProfileInitial } from '@/lib/profileStorage';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getStoredPlaylistUrl, setStoredPlaylistUrl } from '@/lib/playlistStorage';
import {
  readM3UFile,
  parseM3UContent,
  saveLocalChannels,
  getLocalPlaylistName,
  clearLocalChannels
} from '@/lib/localPlaylistStorage';
import { supabase } from '@/integrations/supabase/client';
import universeLogo from '@/assets/universe-tv-logo.png';
import { useWeather } from '@/hooks/useWeather';
import { getParentalControls, saveParentalControls, type ParentalControlSettings } from '@/lib/parentalControls';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

const WeatherIcon = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'sun': return <Sun className="w-5 h-5" />;
    case 'rain': return <CloudRain className="w-5 h-5" />;
    case 'snow': return <Snowflake className="w-5 h-5" />;
    case 'storm': return <CloudLightning className="w-5 h-5" />;
    default: return <Cloud className="w-5 h-5" />;
  }
};

interface MiSettingsPageProps {
  onBack: () => void;
  onPlaylistChange?: () => void;
}

export const MiSettingsPage = ({ onBack, onPlaylistChange }: MiSettingsPageProps) => {
  const [time, setTime] = useState(new Date());
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [showParentalDialog, setShowParentalDialog] = useState(false);
  const [parentalSettings, setParentalSettings] = useState<ParentalControlSettings>(getParentalControls());
  const [passwordInput, setPasswordInput] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [localPlaylistName, setLocalPlaylistName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const weather = useWeather();
  const [profileNameInput, setProfileNameInput] = useState(getProfileName());
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = getStoredPlaylistUrl();
    if (saved) setPlaylistUrl(saved);
    const localName = getLocalPlaylistName();
    if (localName) setLocalPlaylistName(localName);
  }, []);

  const handleSavePlaylist = () => {
    if (playlistUrl.trim()) {
      setStoredPlaylistUrl(playlistUrl.trim());
      clearLocalChannels();
      setLocalPlaylistName(null);
      toast.success('Playlist saved!');
      setShowPlaylistDialog(false);
      onPlaylistChange?.();
    } else {
      toast.error('Please enter a valid M3U URL');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.m3u', '.m3u8'];
    const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isValidFile) {
      toast.error('Please upload a .m3u or .m3u8 file');
      return;
    }

    setIsUploading(true);
    try {
      const content = await readM3UFile(file);
      const channels = parseM3UContent(content);
      if (channels.length === 0) {
        toast.error('No channels found in the playlist file');
        return;
      }
      saveLocalChannels(channels, file.name);
      setLocalPlaylistName(file.name);
      toast.success(`Loaded ${channels.length} channels from ${file.name}`);
      setShowPlaylistDialog(false);
      onPlaylistChange?.();
    } catch (err) {
      console.error('Error reading M3U file:', err);
      toast.error('Failed to read playlist file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFetchFromUrl = async () => {
    const url = playlistUrl.trim();
    if (!url) {
      toast.error('Please enter a valid M3U URL');
      return;
    }

    setIsFetching(true);
    try {
      toast.info('Fetching playlist from server...');
      const { data, error } = await supabase.functions.invoke('fetch-m3u', {
        body: { url, maxChannels: 50000, maxBytesMB: 40, maxReturnPerType: 10000, preferXtreamApi: true }
      });

      if (error) throw new Error(error.message);
      if (data?.blocked) {
        toast.error('Provider blocked the request. Try downloading the M3U file manually.');
        return;
      }
      if (data?.error) throw new Error(data.error);

      if (data?.channels && Array.isArray(data.channels)) {
        const channels = data.channels
          .filter((ch: any) => ch.name && (ch.url || ch.type === 'series'))
          .map((ch: any, idx: number) => ({
            id: `fetched-${idx}`,
            name: ch.name,
            url: ch.url || '',
            logo: ch.logo || undefined,
            group: ch.group || 'Live TV',
            type: ch.type || 'live',
          }));

        if (channels.length === 0) {
          toast.error('No channels found in playlist');
          return;
        }

        saveLocalChannels(channels, `Fetched from URL`);
        setLocalPlaylistName(`${channels.length} channels from URL`);
        toast.success(`Loaded ${channels.length} channels!`);
        setShowPlaylistDialog(false);
        onPlaylistChange?.();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error fetching M3U:', err);
      toast.error(err.message || 'Failed to fetch playlist');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDeleteCache = () => {
    localStorage.removeItem('mi-player-favorites');
    localStorage.removeItem('mi-player-last-channel');
    localStorage.removeItem('mi-player-playlist-url');
    clearLocalChannels();
    setLocalPlaylistName(null);
    toast.success('Cache cleared - reloading with default playlist...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleSaveParentalControls = () => {
    if (parentalSettings.enabled && !passwordInput && !parentalSettings.password) {
      toast.error('Please set a password');
      return;
    }
    const updatedSettings = { ...parentalSettings, password: passwordInput || parentalSettings.password };
    saveParentalControls(updatedSettings);
    toast.success('Parental controls updated');
    setShowParentalDialog(false);
  };

  const accountData = {
    status: 'Active',
    macAddress: '8f:f7:2f:95:d1',
    deviceKey: '170135',
    expireDate: 'Forever'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mi Player Pro Style */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 md:py-6">
        {/* Back & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-card/80 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Center Logo */}
        <div className="hidden md:flex items-center justify-center">
          <img src={universeLogo} alt="Universe TV" className="h-12 w-auto" />
        </div>

        {/* Time & Weather */}
        <div className="flex items-center gap-4 md:gap-6">
          <span className="text-foreground font-medium text-lg">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <WeatherIcon icon={weather.icon} />
            <span>{weather.displayTemp}</span>
          </div>
        </div>
      </header>

      {/* Main Content - Mi Player Pro Layout */}
      <main className="px-6 md:px-10 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
          {/* Left Panel - Account Info */}
          <div className="flex-1 bg-card rounded-2xl border border-border/30 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-xl font-semibold text-foreground">Account</h2>
            </div>

            {/* Profile Name */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/30 shrink-0">
                <span className="text-white font-bold text-xl">{getProfileInitial()}</span>
              </div>
              <div className="flex-1 min-w-0">
                {isEditingProfile ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={profileNameInput}
                      onChange={(e) => setProfileNameInput(e.target.value)}
                      placeholder="Enter your name"
                      className="bg-secondary border-border/50 h-10 text-foreground"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setProfileName(profileNameInput);
                          setIsEditingProfile(false);
                          toast.success('Profile name saved!');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        setProfileName(profileNameInput);
                        setIsEditingProfile(false);
                        toast.success('Profile name saved!');
                      }}
                      className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-foreground font-semibold text-lg">{getProfileName() || 'Set your name'}</p>
                      <p className="text-muted-foreground text-sm">Profile Name</p>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="ml-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Account Details Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border/30">
                <span className="text-muted-foreground">Account Status :</span>
                <span className="text-accent font-medium">{accountData.status}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/30">
                <span className="text-muted-foreground">Mac Address :</span>
                <span className="text-foreground font-mono">{accountData.macAddress}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/30">
                <span className="text-muted-foreground">Device Key :</span>
                <span className="text-foreground font-mono">{accountData.deviceKey}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">Expire Date :</span>
                <span className="text-foreground">{accountData.expireDate}</span>
              </div>
            </div>
          </div>

          {/* Right Panel - Action Buttons */}
          <div className="w-full md:w-80 flex flex-col gap-3">
            {/* Parent Control */}
            <button 
              onClick={() => setShowParentalDialog(true)}
              className="w-full flex items-center gap-4 px-6 py-5 bg-card rounded-2xl border border-border/30 hover:bg-card/80 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Shield className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground font-medium text-lg block">Parental Controls</span>
                {parentalSettings.enabled && <span className="text-accent text-sm">Active</span>}
              </div>
            </button>

            {/* Change Playlist */}
            <button
              onClick={() => setShowPlaylistDialog(true)}
              className="w-full flex items-center gap-4 px-6 py-5 bg-card rounded-2xl border border-border/30 hover:bg-card/80 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ListVideo className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground font-medium text-lg block">Change Playlist</span>
                {localPlaylistName && (
                  <span className="text-muted-foreground text-sm">{localPlaylistName}</span>
                )}
              </div>
            </button>

            {/* Delete Cache */}
            <button
              onClick={handleDeleteCache}
              className="w-full flex items-center gap-4 px-6 py-5 bg-card rounded-2xl border border-border/30 hover:bg-card/80 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-foreground font-medium text-lg">Delete Cache</span>
            </button>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-muted-foreground text-sm mt-12">Version 1.1.1</p>
      </main>

      {/* Playlist Dialog */}
      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent className="bg-card border-border/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">Playlist Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Recommended: File Upload */}
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Upload className="w-5 h-5 text-accent" />
                <strong className="text-foreground">Recommended for Web</strong>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Upload your M3U file directly. Streams will play from your device's IP.
              </p>
              <button
                onClick={() => { setShowPlaylistDialog(false); setTimeout(() => fileInputRef.current?.click(), 100); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="font-medium">Upload M3U File</span>
              </button>
            </div>

            {/* Fetch from URL */}
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Or fetch from URL</label>
              <Input
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="http://example.com/playlist.m3u"
                className="bg-secondary border-border/50 h-12 text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handleFetchFromUrl}
                disabled={isFetching || !playlistUrl.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isFetching ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Fetching...</span></>
                ) : (
                  <><Download className="w-4 h-4" /><span>Fetch & Load Channels</span></>
                )}
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPlaylistDialog(false)} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </button>
              <button onClick={handleSavePlaylist} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
                <Check className="w-5 h-5" />
                <span>Save URL</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parental Controls Dialog */}
      <Dialog open={showParentalDialog} onOpenChange={setShowParentalDialog}>
        <DialogContent className="bg-card border-border/30 max-w-2xl max-h-[90vh] overflow-y-auto mi-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Parental Controls
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base font-medium">Enable Parental Controls</Label>
                <p className="text-sm text-muted-foreground">Restrict content and set time limits</p>
              </div>
              <Switch
                checked={parentalSettings.enabled}
                onCheckedChange={(checked) => setParentalSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {parentalSettings.enabled && (
              <>
                <div className="space-y-3 p-4 border border-border/30 rounded-lg">
                  <Label className="font-medium">Password</Label>
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={parentalSettings.password ? 'Change password' : 'Set password (min 4 chars)'}
                    className="bg-secondary border-border/50"
                  />
                </div>

                <div className="space-y-3 p-4 border border-border/30 rounded-lg">
                  <Label className="font-medium">Hide Content Types</Label>
                  <div className="space-y-3">
                    {[
                      { key: 'movies', label: 'Movies', icon: '🎬' },
                      { key: 'series', label: 'Series', icon: '📺' },
                      { key: 'live', label: 'Live TV', icon: '🔴' },
                      { key: 'sports', label: 'Sports', icon: '⚽' },
                    ].map(({ key, label, icon }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`hide-${key}`}
                          checked={parentalSettings.hiddenContent[key as keyof typeof parentalSettings.hiddenContent]}
                          onCheckedChange={(checked) =>
                            setParentalSettings(prev => ({
                              ...prev,
                              hiddenContent: { ...prev.hiddenContent, [key]: checked }
                            }))
                          }
                        />
                        <label htmlFor={`hide-${key}`} className="text-sm font-medium flex items-center gap-2">
                          <span>{icon}</span> Hide {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-4 border border-border/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Daily Time Limit</Label>
                    <Switch
                      checked={parentalSettings.timeLimit.enabled}
                      onCheckedChange={(checked) =>
                        setParentalSettings(prev => ({
                          ...prev,
                          timeLimit: { ...prev.timeLimit, enabled: checked }
                        }))
                      }
                    />
                  </div>
                  {parentalSettings.timeLimit.enabled && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Limit per day:</span>
                        <span className="text-sm font-medium">{parentalSettings.timeLimit.dailyLimitMinutes} min</span>
                      </div>
                      <Slider
                        value={[parentalSettings.timeLimit.dailyLimitMinutes]}
                        onValueChange={([value]) =>
                          setParentalSettings(prev => ({
                            ...prev,
                            timeLimit: { ...prev.timeLimit, dailyLimitMinutes: value }
                          }))
                        }
                        min={15}
                        max={480}
                        step={15}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowParentalDialog(false)}
                className="flex-1 px-6 py-3 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveParentalControls}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                Save Controls
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".m3u,.m3u8"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
