import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Link2, Key, ChevronRight, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, ArrowLeft, Radio } from 'lucide-react';
import { ChromaKeyVideo } from '@/components/shared/ChromaKeyVideo';
import logoVideo from '@/assets/logo-transparent.mp4';
import {
  ProviderAccount,
  ProviderType,
  XtreamConfig,
  M3UConfig,
  AccessCodeConfig,
} from '@/lib/providers/types';
import {
  getProviderAccounts,
  addProviderAccount,
  removeProviderAccount,
  setActiveAccountId,
  createProviderAccount,
} from '@/lib/providers/storage';
import { authenticateXtream, validateM3UUrl } from '@/lib/providers/providerService';

interface ProviderSetupProps {
  onProviderReady: (account: ProviderAccount) => void;
  existingAccounts?: ProviderAccount[];
}

type SetupStep = 'select-method' | 'xtream-form' | 'm3u-form' | 'access-code-form' | 'account-list';

export const ProviderSetup = ({ onProviderReady, existingAccounts = [] }: ProviderSetupProps) => {
  const [step, setStep] = useState<SetupStep>(existingAccounts.length > 0 ? 'account-list' : 'select-method');
  const [accounts, setAccounts] = useState<ProviderAccount[]>(existingAccounts);

  // Xtream form
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');
  const [xtreamName, setXtreamName] = useState('');

  // M3U form
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uEpg, setM3uEpg] = useState('');
  const [m3uName, setM3uName] = useState('');

  // Access code form
  const [acServer, setAcServer] = useState('');
  const [acCode, setAcCode] = useState('');
  const [acName, setAcName] = useState('');

  // Status
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');

  const resetForms = () => {
    setXtreamServer(''); setXtreamUser(''); setXtreamPass(''); setXtreamName('');
    setM3uUrl(''); setM3uEpg(''); setM3uName('');
    setAcServer(''); setAcCode(''); setAcName('');
    setConnectError(''); setConnectSuccess('');
  };

  // ── Xtream Login ─────────────────────────────────────────
  const handleXtreamLogin = async () => {
    if (!xtreamServer.trim() || !xtreamUser.trim() || !xtreamPass.trim()) return;
    setConnecting(true);
    setConnectError('');
    setConnectSuccess('');

    const config: XtreamConfig = {
      type: 'xtream',
      serverUrl: xtreamServer.trim(),
      username: xtreamUser.trim(),
      password: xtreamPass.trim(),
    };

    const result = await authenticateXtream(config);

    if (!result.success) {
      setConnectError(result.error || 'Connection failed');
      setConnecting(false);
      return;
    }

    setConnectSuccess('Connected! Loading content...');
    const account = createProviderAccount(
      xtreamName.trim() || `${config.username}@${new URL(config.serverUrl).hostname}`,
      config,
      { accountInfo: result.accountInfo, providerName: result.providerName }
    );
    addProviderAccount(account);
    setActiveAccountId(account.id);
    setAccounts(getProviderAccounts());

    setTimeout(() => {
      setConnecting(false);
      onProviderReady(account);
    }, 500);
  };

  // ── M3U Login ────────────────────────────────────────────
  const handleM3ULogin = async () => {
    if (!m3uUrl.trim()) return;
    setConnecting(true);
    setConnectError('');
    setConnectSuccess('');

    const config: M3UConfig = {
      type: 'm3u',
      m3uUrl: m3uUrl.trim(),
      epgUrl: m3uEpg.trim() || undefined,
    };

    const result = await validateM3UUrl(config);

    if (!result.success) {
      setConnectError(result.error || 'Invalid playlist');
      setConnecting(false);
      return;
    }

    setConnectSuccess(`Found ${result.channelCount} channels! Loading...`);
    const account = createProviderAccount(
      m3uName.trim() || 'M3U Playlist',
      config
    );
    addProviderAccount(account);
    setActiveAccountId(account.id);
    setAccounts(getProviderAccounts());

    setTimeout(() => {
      setConnecting(false);
      onProviderReady(account);
    }, 500);
  };

  // ── Access Code Login ────────────────────────────────────
  const handleAccessCodeLogin = async () => {
    if (!acServer.trim() || !acCode.trim()) return;
    setConnecting(true);
    setConnectError('');
    setConnectSuccess('');

    const config: AccessCodeConfig = {
      type: 'access_code',
      serverUrl: acServer.trim(),
      accessCode: acCode.trim(),
    };

    // Try to validate as M3U-style
    const serverUrl = config.serverUrl.replace(/\/+$/, '');
    const testUrl = `${serverUrl}/get.php?username=${encodeURIComponent(config.accessCode)}&password=${encodeURIComponent(config.accessCode)}&type=m3u_plus&output=ts`;

    const result = await validateM3UUrl({ type: 'm3u', m3uUrl: testUrl });

    if (!result.success) {
      setConnectError(result.error || 'Invalid access code or server');
      setConnecting(false);
      return;
    }

    setConnectSuccess(`Found ${result.channelCount} channels!`);
    const account = createProviderAccount(
      acName.trim() || 'Portal Access',
      config
    );
    addProviderAccount(account);
    setActiveAccountId(account.id);
    setAccounts(getProviderAccounts());

    setTimeout(() => {
      setConnecting(false);
      onProviderReady(account);
    }, 500);
  };

  const handleDeleteAccount = (id: string) => {
    removeProviderAccount(id);
    setAccounts(getProviderAccounts());
  };

  const handleSelectAccount = (account: ProviderAccount) => {
    setActiveAccountId(account.id);
    onProviderReady(account);
  };

  // ── Shared input style ───────────────────────────────────
  const inputClass = "w-full px-4 py-3 rounded-xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";
  const btnPrimary = "w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <ChromaKeyVideo src={logoVideo} className="h-28 mx-auto" />
          <p className="text-muted-foreground text-sm">Your Universal IPTV Player</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Account List ─────────────────────────────── */}
          {step === 'account-list' && (
            <motion.div key="account-list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground text-center">Your Accounts</h2>

              <div className="space-y-2">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 group">
                    <button onClick={() => handleSelectAccount(acc)} className="flex-1 flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {acc.config.type === 'xtream' ? <Wifi className="w-5 h-5 text-primary" /> :
                         acc.config.type === 'm3u' ? <Link2 className="w-5 h-5 text-primary" /> :
                         <Key className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{acc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{acc.config.type === 'xtream' ? 'Xtream Codes' : acc.config.type === 'm3u' ? 'M3U Playlist' : 'Access Code'}</p>
                      </div>
                    </button>
                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>

              <button onClick={() => { resetForms(); setStep('select-method'); }} className="w-full py-3 rounded-xl border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Add New Provider
              </button>
            </motion.div>
          )}

          {/* ── Method Selection ─────────────────────────── */}
          {step === 'select-method' && (
            <motion.div key="select-method" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
              {accounts.length > 0 && (
                <button onClick={() => setStep('account-list')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to accounts
                </button>
              )}
              <h2 className="text-lg font-semibold text-foreground text-center">Add Provider</h2>
              <p className="text-muted-foreground text-sm text-center">Choose how to connect</p>

              {[
                { id: 'xtream-form' as SetupStep, icon: Wifi, label: 'Xtream Codes', desc: 'Server URL, username & password' },
                { id: 'm3u-form' as SetupStep, icon: Link2, label: 'M3U Playlist URL', desc: 'Direct M3U or M3U8 link' },
                { id: 'access-code-form' as SetupStep, icon: Key, label: 'Access Code / Portal', desc: 'Server URL + activation code' },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => { resetForms(); setStep(method.id); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/40 hover:bg-card/80 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <method.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-foreground">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </motion.div>
          )}

          {/* ── Xtream Form ──────────────────────────────── */}
          {step === 'xtream-form' && (
            <motion.div key="xtream" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <button onClick={() => setStep('select-method')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <Wifi className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-foreground">Xtream Codes Login</h2>
              </div>

              <div className="space-y-3">
                <input placeholder="Server URL (e.g. http://example.com:8080)" value={xtreamServer} onChange={e => setXtreamServer(e.target.value)} className={inputClass} />
                <input placeholder="Username" value={xtreamUser} onChange={e => setXtreamUser(e.target.value)} className={inputClass} autoComplete="username" />
                <input placeholder="Password" type="password" value={xtreamPass} onChange={e => setXtreamPass(e.target.value)} className={inputClass} autoComplete="current-password" />
                <input placeholder="Account label (optional)" value={xtreamName} onChange={e => setXtreamName(e.target.value)} className={inputClass} />
              </div>

              {connectError && <p className="text-destructive text-sm text-center flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4" />{connectError}</p>}
              {connectSuccess && <p className="text-emerald-400 text-sm text-center flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" />{connectSuccess}</p>}

              <button onClick={handleXtreamLogin} disabled={connecting || !xtreamServer.trim() || !xtreamUser.trim() || !xtreamPass.trim()} className={btnPrimary}>
                {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </motion.div>
          )}

          {/* ── M3U Form ─────────────────────────────────── */}
          {step === 'm3u-form' && (
            <motion.div key="m3u" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <button onClick={() => setStep('select-method')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <Link2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-foreground">M3U Playlist</h2>
              </div>

              <div className="space-y-3">
                <input placeholder="M3U / M3U8 URL" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} className={inputClass} />
                <input placeholder="EPG URL (optional)" value={m3uEpg} onChange={e => setM3uEpg(e.target.value)} className={inputClass} />
                <input placeholder="Playlist name (optional)" value={m3uName} onChange={e => setM3uName(e.target.value)} className={inputClass} />
              </div>

              {connectError && <p className="text-destructive text-sm text-center flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4" />{connectError}</p>}
              {connectSuccess && <p className="text-emerald-400 text-sm text-center flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" />{connectSuccess}</p>}

              <button onClick={handleM3ULogin} disabled={connecting || !m3uUrl.trim()} className={btnPrimary}>
                {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {connecting ? 'Validating...' : 'Load Playlist'}
              </button>
            </motion.div>
          )}

          {/* ── Access Code Form ─────────────────────────── */}
          {step === 'access-code-form' && (
            <motion.div key="access-code" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <button onClick={() => setStep('select-method')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center">
                <Key className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-lg font-semibold text-foreground">Access Code / Portal</h2>
              </div>

              <div className="space-y-3">
                <input placeholder="Portal / Server URL" value={acServer} onChange={e => setAcServer(e.target.value)} className={inputClass} />
                <input placeholder="Access Code / Activation Code" value={acCode} onChange={e => setAcCode(e.target.value)} className={inputClass} />
                <input placeholder="Account label (optional)" value={acName} onChange={e => setAcName(e.target.value)} className={inputClass} />
              </div>

              {connectError && <p className="text-destructive text-sm text-center flex items-center justify-center gap-1"><AlertCircle className="w-4 h-4" />{connectError}</p>}
              {connectSuccess && <p className="text-emerald-400 text-sm text-center flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" />{connectSuccess}</p>}

              <button onClick={handleAccessCodeLogin} disabled={connecting || !acServer.trim() || !acCode.trim()} className={btnPrimary}>
                {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {connecting ? 'Verifying...' : 'Connect'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
