import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldCheck, 
  Bell, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  KeyRound, 
  Fingerprint, 
  Save, 
  HardDrive,
  Globe,
  Sliders,
  Share2,
  Database,
  Link2,
  FileCheck,
  Check,
  ExternalLink,
  Smartphone,
  Mail,
  UserCheck,
  Download,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export function CitizenSettingsPage() {
  const { currentUser, showToast } = useAuth();

  // Active navigation tab among the 4 requested sections
  const [activeTab, setActiveTab] = useState('auth'); // 'auth' | 'notifications' | 'privacy' | 'integrations'

  // Helper to read initial saved settings
  const getInitialSettings = () => {
    try {
      const stored = localStorage.getItem('titlelock_citizen_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // fallback
    }
    return {
      // 1. Authentication Security Settings
      hardware2FA: true,
      biometricSigning: true,
      autoQuorumApproval: false,
      sessionTimeoutMinutes: '30',
      hardwareKeyName: 'YubiKey 5 NFC (Registered)',
      hardwareKeyStatus: 'ACTIVE',
      requirePinOnTransfer: true,

      // 2. Notifications & Alert Settings
      emailAlerts: true,
      customAlertEmail: currentUser?.email || 'rajesh.kumar@titlelock.gov.in',
      smsAlerts: true,
      customSmsNumber: currentUser?.phone || '+91 98765 43210',
      deedNotificationFrequency: 'INSTANT', // 'INSTANT' | 'DAILY' | 'CRITICAL'
      pushNotifications: true,
      disputeAlerts: true,
      subRegistrarNoticeAlerts: true,

      // 3. Privacy Settings
      cadastralVisibility: 'RESTRICTED', // 'PUBLIC' | 'RESTRICTED' | 'TITLEHOLDER_ONLY'
      maskEncumbranceOnLedger: true,
      nomineeDiscoverability: false,
      allowThirdPartySurveyLookup: false,
      anonymizePublicAuditFeed: true,
      dataRetentionYears: 'PERPETUAL',

      // 4. Integrations Settings
      digiLockerSync: true,
      digiLockerDocId: 'DL-IND-2024-8849-01',
      cersaiRegistrySync: true,
      cersaiAssetCode: 'CERSAI-IND-DLH-9921',
      stateLandRecordGateway: true,
      statePortalName: 'Bhulekh / UP-DILRMP v3.2',
      blockchainWebhookSync: false,
      webhookEndpointUrl: 'https://api.staterevenue.gov.in/cadastre/webhook'
    };
  };

  // Saved baseline state (only updates when user commits via "Save Preferences")
  const [savedSettings, setSavedSettings] = useState(getInitialSettings);

  // Draft state (editable freely, but discarded on Cancel or until Save is clicked)
  const [draftSettings, setDraftSettings] = useState(getInitialSettings);
  const [saving, setSaving] = useState(false);

  // PIN / Password form state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [updatingPin, setUpdatingPin] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Calculate dirty status across all sections
  const isDirty = JSON.stringify(savedSettings) !== JSON.stringify(draftSettings);

  // Discard all changes
  const handleCancel = () => {
    setDraftSettings(savedSettings);
    showToast('Changes discarded — preferences restored to saved state', 'info');
  };

  // Commit all changes
  const handleSavePreferences = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSavedSettings(draftSettings);
      localStorage.setItem('titlelock_citizen_settings', JSON.stringify(draftSettings));
      setSaving(false);
      showToast('All settings across all sections successfully saved', 'success');
    }, 400);
  };

  // Change PIN handler
  const handleChangeSecurityPin = (e) => {
    e.preventDefault();
    if (!currentPin) {
      showToast('Please enter your current PIN', 'warning');
      return;
    }
    if (newPin.length < 4) {
      showToast('PIN must be at least 4 digits', 'warning');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('New PIN confirmation does not match', 'warning');
      return;
    }
    setUpdatingPin(true);
    setTimeout(() => {
      setUpdatingPin(false);
      showToast('Transaction Security PIN updated successfully', 'success');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    }, 400);
  };

  // Handle Export RoR Data Bundle
  const handleExportDataBundle = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        citizen: currentUser?.name || 'Rajesh Kumar',
        aadhaar: currentUser?.aadhaarNumber || 'XXXX-XXXX-8921',
        titleSettings: savedSettings,
        timestamp: new Date().toISOString(),
        verifiedBy: "Sub-Registrar Noida-I & TitleLock Network"
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `TitleLock_Citizen_Cadastre_Export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Encrypted RoR citizen archive downloaded', 'success');
    }, 600);
  };

  const tabs = [
    { id: 'auth', label: 'Authentication Security', icon: ShieldCheck, badge: 'High Security' },
    { id: 'notifications', label: 'Notifications & Alerts', icon: Bell, badge: 'Realtime' },
    { id: 'privacy', label: 'Privacy Settings', icon: EyeOff, badge: 'Cadastre' },
    { id: 'integrations', label: 'Integrations', icon: Layers, badge: 'e-Gov' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authentication security, notifications & alert channels, cadastral privacy disclosure, and statutory integrations.
          </p>
        </div>
        {isDirty && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold self-start sm:self-auto shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Unsaved Changes Pending
          </div>
        )}
      </div>

      {/* Main Settings Layout: Responsive Sidebar + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-1.5">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Settings Menu
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0b6b4e] text-white shadow-sm shadow-emerald-900/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sidebar Status / Summary Card */}
          <div className="bg-slate-50 rounded-3xl p-4 border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Section 5 Security Status</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cryptographic keys and biometric verification policies are locked to your Aadhaar-linked citizen profile.
            </p>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>Security Level:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ACTIVE • REINFORCED
              </span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="lg:col-span-8 space-y-6">
          {/* SECTION 1: AUTHENTICATION SECURITY SETTINGS */}
          {activeTab === 'auth' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Authentication Security Settings</h2>
                    <p className="text-[11px] text-slate-400">Cryptographic protection for Record of Rights (RoR) conveyance and Sell Token minting</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Toggle: Hardware 2FA */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span>FIDO2 / WebAuthn Hardware 2FA</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Require biometric fingerprint or physical security key approval before releasing single-use Sell Tokens.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, hardware2FA: !draftSettings.hardware2FA })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.hardware2FA ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.hardware2FA ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Registered Security Key info */}
                  {draftSettings.hardware2FA && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-medium">
                        <KeyRound className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 text-[11px]">{draftSettings.hardwareKeyName}</div>
                          <div className="text-[10px] text-slate-500">Hardware Attestation: Ed25519 Secure Enclave</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider">
                        {draftSettings.hardwareKeyStatus}
                      </span>
                    </div>
                  )}

                  {/* Toggle: Biometric Attestation */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <Fingerprint className="w-3.5 h-3.5 text-sky-600" />
                        <span>e-Sign Biometric Attestation</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Automatically embed Section 5 digital signatures into registered sale deed petitions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, biometricSigning: !draftSettings.biometricSigning })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.biometricSigning ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.biometricSigning ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle: Quorum Auto-Approval */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Automated Quorum Counter-Signing</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Auto-countersign co-owner petitions if boundary matches registry hash and title is unencumbered.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, autoQuorumApproval: !draftSettings.autoQuorumApproval })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.autoQuorumApproval ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.autoQuorumApproval ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Session Inactivity Timeout Selector */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Security Session Inactivity Timeout</div>
                        <p className="text-[11px] text-slate-500">Automatically disconnect session if no land portal activity detected</p>
                      </div>
                      <select
                        value={draftSettings.sessionTimeoutMinutes}
                        onChange={(e) => setDraftSettings({ ...draftSettings, sessionTimeoutMinutes: e.target.value })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes (Recommended)</option>
                        <option value="60">1 Hour</option>
                        <option value="120">2 Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction PIN Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4 text-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Registry Transaction PIN</h2>
                    <p className="text-[11px] text-slate-400">Security code required to authorize sell tokens and petition countersignatures</p>
                  </div>
                </div>

                <form onSubmit={handleChangeSecurityPin} className="space-y-3.5 max-w-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Current PIN / Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        placeholder="Enter current PIN"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPins(!showPins)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        New 4-6 Digit PIN
                      </label>
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="New PIN"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="Repeat PIN"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPin}
                    className="px-4 py-2 rounded-xl font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-xs disabled:opacity-50"
                  >
                    {updatingPin ? 'Updating...' : 'Update Transaction PIN'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION 2: NOTIFICATIONS AND ALERT SETTINGS                     */}
          {/* ============================================================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-5 text-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Notifications & Alert Settings</h2>
                    <p className="text-[11px] text-slate-400">Configure multi-channel conveyance dispatch and Sub-Registrar statutory alerts</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Email Alerts & Destination */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">Email Deed Alerts</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Dispatch official conveyance notices and sale deeds to verified mail
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSettings({ ...draftSettings, emailAlerts: !draftSettings.emailAlerts })}
                        className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                          draftSettings.emailAlerts ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                            draftSettings.emailAlerts ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {draftSettings.emailAlerts && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Designated Notification Email
                        </label>
                        <input
                          type="email"
                          value={draftSettings.customAlertEmail}
                          onChange={(e) => setDraftSettings({ ...draftSettings, customAlertEmail: e.target.value })}
                          placeholder="Enter official email"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-mono font-medium focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* SMS Alerts & Phone Number */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Smartphone className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">SMS & Mobile OTP Alerts</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Fallback dispatch to verified citizen mobile for rapid transaction authorization
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSettings({ ...draftSettings, smsAlerts: !draftSettings.smsAlerts })}
                        className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                          draftSettings.smsAlerts ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                            draftSettings.smsAlerts ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {draftSettings.smsAlerts && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Designated Mobile Phone Number
                        </label>
                        <input
                          type="tel"
                          value={draftSettings.customSmsNumber}
                          onChange={(e) => setDraftSettings({ ...draftSettings, customSmsNumber: e.target.value })}
                          placeholder="+91..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-mono font-medium focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Browser Push Notifications */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">Web Push Notifications</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Show real-time badge updates and toast alerts inside the portal when parcels are viewed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, pushNotifications: !draftSettings.pushNotifications })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.pushNotifications ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.pushNotifications ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sub-Registrar Notices */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">Statutory Sub-Registrar Notices</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Immediate dispatch for land gazette notifications, master plan zoning changes, and survey updates.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, subRegistrarNoticeAlerts: !draftSettings.subRegistrarNoticeAlerts })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.subRegistrarNoticeAlerts ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.subRegistrarNoticeAlerts ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dispatch Frequency Select */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Audit Dispatch Frequency
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'INSTANT', title: 'Instant Real-time', desc: 'As transactions happen' },
                        { id: 'DAILY', title: 'Daily Digest', desc: 'Summary at 8:00 PM' },
                        { id: 'CRITICAL', title: 'Critical Only', desc: 'Disputes & Transfers' }
                      ].map((freq) => (
                        <button
                          key={freq.id}
                          type="button"
                          onClick={() => setDraftSettings({ ...draftSettings, deedNotificationFrequency: freq.id })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            draftSettings.deedNotificationFrequency === freq.id
                              ? 'bg-white border-[#0b6b4e] ring-2 ring-[#0b6b4e]/10 shadow-xs text-slate-900'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div className="font-bold text-xs">{freq.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{freq.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION 3: PRIVACY SETTINGS                                     */}
          {/* ============================================================== */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-5 text-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Privacy & Cadastral Disclosure Settings</h2>
                    <p className="text-[11px] text-slate-400">Control boundary visibility, ledger data masking, and public RoR discoverability</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Cadastral Visibility Selector */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Cadastral Boundary Visibility</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Controls who can inspect exact GPS boundary polygons and coordinates on the public blockchain explorer
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {[
                        { id: 'PUBLIC', title: 'Open Public', desc: 'Visible to all citizens' },
                        { id: 'RESTRICTED', title: 'Certified Only', desc: 'Registrars & Bank Valuers' },
                        { id: 'TITLEHOLDER_ONLY', title: 'Private / Owner', desc: 'Requires token unlock' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraftSettings({ ...draftSettings, cadastralVisibility: opt.id })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            draftSettings.cadastralVisibility === opt.id
                              ? 'bg-white border-[#0b6b4e] ring-2 ring-[#0b6b4e]/10 shadow-xs text-slate-900'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div className="font-bold text-xs">{opt.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mask Encumbrance on Ledger */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">Cryptographic Encumbrance Masking</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Mask bank mortgage values and commercial lien specifics using zero-knowledge commitments on public nodes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, maskEncumbranceOnLedger: !draftSettings.maskEncumbranceOnLedger })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.maskEncumbranceOnLedger ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.maskEncumbranceOnLedger ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Nominee Discoverability */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">Succession & Nominee Discoverability</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Allow designated legal heirs and succession nominees to view title records prior to probate petition filing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, nomineeDiscoverability: !draftSettings.nomineeDiscoverability })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.nomineeDiscoverability ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.nomineeDiscoverability ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Public Feed Anonymization */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">Anonymize Public RoR Audit Ledger Feed</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Replace citizen full name with truncated cryptographic public address on state-level transaction tickers.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, anonymizePublicAuditFeed: !draftSettings.anonymizePublicAuditFeed })}
                      className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        draftSettings.anonymizePublicAuditFeed ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                          draftSettings.anonymizePublicAuditFeed ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Export & RoR Dossier Download */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Download Statutory RoR Dossier</h2>
                    <p className="text-[11px] text-slate-400">Export your complete land holding record, privacy policy audit, and cadastral signatures</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Certified Land Record Archive (JSON / Cryptographic Token)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Includes full hash history, e-KYC attestation, and Section 5 proof</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportDataBundle}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer text-xs flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>{isExporting ? 'Generating...' : 'Export Citizen Bundle'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SECTION 4: INTEGRATIONS SETTINGS                                */}
          {/* ============================================================== */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-5 text-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Government & Financial Integrations</h2>
                    <p className="text-[11px] text-slate-400">Manage real-time bridges to DigiLocker, CERSAI mortgage registries, and state land portals</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* DigiLocker Connector */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          DL
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>DigiLocker National e-Vault Sync</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
                              CERTIFIED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Auto-push registered sale deeds and mutation certificates into your official DigiLocker account.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSettings({ ...draftSettings, digiLockerSync: !draftSettings.digiLockerSync })}
                        className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                          draftSettings.digiLockerSync ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                            draftSettings.digiLockerSync ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {draftSettings.digiLockerSync && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-500">Linked Doc URI: {draftSettings.digiLockerDocId}</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Connected
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CERSAI Mortgage Registry Connector */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          CR
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>CERSAI Security Interest Registry Bridge</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              MORTGAGE SAFE
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cross-reference TitleLock parcels with central banking encumbrance database to eliminate double-mortgage fraud.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSettings({ ...draftSettings, cersaiRegistrySync: !draftSettings.cersaiRegistrySync })}
                        className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                          draftSettings.cersaiRegistrySync ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                            draftSettings.cersaiRegistrySync ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {draftSettings.cersaiRegistrySync && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-500">Asset Record: {draftSettings.cersaiAssetCode}</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Live Audit Synced
                        </span>
                      </div>
                    )}
                  </div>

                  {/* State Land Records Gateway (Bhulekh) */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          BK
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>State Land Records API Gateway</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              STATUTORY
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Continuous hash synchronization with {draftSettings.statePortalName} for instant mutation validation.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSettings({ ...draftSettings, stateLandRecordGateway: !draftSettings.stateLandRecordGateway })}
                        className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                          draftSettings.stateLandRecordGateway ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                            draftSettings.stateLandRecordGateway ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {draftSettings.stateLandRecordGateway && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">Gateway: UP Revenue Board Noida-I</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> 2-Way Cadastral Pinned
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Blockchain Webhook Connector */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Custom Blockchain Audit Webhook</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Transmit real-time JSON payloads to your private accounting or legal compliance enterprise webhook.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftSettings({ ...draftSettings, blockchainWebhookSync: !draftSettings.blockchainWebhookSync })}
                        className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                          draftSettings.blockchainWebhookSync ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                            draftSettings.blockchainWebhookSync ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {draftSettings.blockchainWebhookSync && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Webhook HTTPS Payload URL
                        </label>
                        <input
                          type="url"
                          value={draftSettings.webhookEndpointUrl}
                          onChange={(e) => setDraftSettings({ ...draftSettings, webhookEndpointUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-mono font-medium focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unified Save & Discard Action Card at bottom of active section */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs">
              {isDirty ? (
                <div className="flex items-center gap-2 text-amber-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>You have unsaved changes in your preferences. Click Save to persist.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All settings are currently synced and up to date.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {isDirty && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-colors cursor-pointer text-xs"
                >
                  Discard Changes
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={saving || !isDirty}
                className={"px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer text-xs " + (
                  isDirty
                    ? "bg-[#0b6b4e] hover:bg-[#09573f] text-white shadow-emerald-900/10"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CitizenSettingsPage;

