import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  User, 
  Wallet, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Building2, 
  Edit3, 
  Save, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  KeyRound,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CitizenProfilePage() {
  const { currentUser, updateProfile, parcels, nomineeProperties, userTransfers, showToast } = useAuth();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Initial values helper
  const getInitialFormState = (user) => ({
    name: user?.name || 'Rajesh Kumar',
    email: user?.email || 'rajesh.kumar@titlelock.gov.in',
    phone: user?.phone || '+91 98765 43210',
    jurisdiction: user?.jurisdiction || 'Gautam Buddha Nagar / Noida, UP',
    residentialAddress: user?.residentialAddress || 'Plot 42, Sector 15-A, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201301',
    description: user?.description || 'Verified Titleholder with registered cadastre parcels under Section 5 Registry Protocol',
    aadharMasked: user?.aadharMasked || 'XXXX-XXXX-8921',
    panNumber: user?.panNumber || 'ABCDE1234F',
    primaryNomineeName: user?.primaryNomineeName || 'Aarav Kumar',
    nomineeRelation: user?.nomineeRelation || 'Son',
    emergencyContact: user?.emergencyContact || '+91 98112 00491',
    recoveryGuardian: user?.recoveryGuardian || 'Dr. Virendra Kumar (Father)'
  });

  // Working draft form state
  const [formData, setFormData] = useState(() => getInitialFormState(currentUser));

  // Sovereign key
  const sovereignWallet = currentUser?.wallet || "0x742d35Cc6634C0532925a3b8448c454e4438f44c";

  const permissions = [
    { key: "CAN_VIEW_OWNED_TITLES", label: "CAN_VIEW_OWNED_TITLES", desc: "Access full cadastral parcel boundaries & title records" },
    { key: "CAN_ISSUE_SELL_TOKENS", label: "CAN_ISSUE_SELL_TOKENS", desc: "Generate single-use cryptographic tokens for buyers" },
    { key: "CAN_APPROVE_TRANSFERS", label: "CAN_APPROVE_TRANSFERS", desc: "Counter-sign conveyance petitions before Sub-Registrar review" },
    { key: "CAN_RECEIVE_DEED_NOTICES", label: "CAN_RECEIVE_DEED_NOTICES", desc: "Real-time dispatch on encumbrance and statutory title notices" },
  ];

  const handleCopy = () => {
    navigator.clipboard?.writeText(sovereignWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Revert all form changes back to saved user state
  const handleCancel = () => {
    setFormData(getInitialFormState(currentUser));
    setIsEditing(false);
    showToast('Edits cancelled without saving changes', 'info');
  };

  // Save changes explicitly
  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Name cannot be empty', 'warning');
      return;
    }
    if (!formData.email.trim()) {
      showToast('Email address is required', 'warning');
      return;
    }

    updateProfile({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      jurisdiction: formData.jurisdiction,
      residentialAddress: formData.residentialAddress,
      description: formData.description,
      aadharMasked: formData.aadharMasked,
      panNumber: formData.panNumber,
      primaryNomineeName: formData.primaryNomineeName,
      nomineeRelation: formData.nomineeRelation,
      emergencyContact: formData.emergencyContact,
      recoveryGuardian: formData.recoveryGuardian
    });

    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Citizen Profile & Sovereign Identity
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authenticated citizen credentials, cadastral address, and statutory registry privileges.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isEditing) {
              handleCancel();
            } else {
              setFormData(getInitialFormState(currentUser));
              setIsEditing(true);
            }
          }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs self-start sm:self-auto ${
            isEditing
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-[#0b6b4e] text-white hover:bg-[#08523c]'
          }`}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4" />
              <span>Cancel Editing</span>
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile Details</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Identity & Edit Card */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Citizen Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-6 text-xs">
            
            {/* Header / Avatar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border-2 border-emerald-500/30 flex items-center justify-center text-slate-800 font-bold text-lg flex-shrink-0 shadow-xs">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{currentUser?.name?.slice(0, 2) || 'RK'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base sm:text-lg text-slate-900">
                      {currentUser?.name || 'Rajesh Kumar'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      e-KYC VERIFIED
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Citizen ID: {currentUser?.id || 'USR-001'} • Government Gateway Linked
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px]">
                <span className="text-slate-400 block font-medium">Cadastral Jurisdiction:</span>
                <span className="text-slate-800 font-bold">{formData.jurisdiction}</span>
              </div>
            </div>

            {/* Editing Form or Static Display */}
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Registered Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Registry Jurisdiction
                    </label>
                    <input
                      type="text"
                      value={formData.jurisdiction}
                      onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                </div>

                {/* Additional Editable: Residential Cadastral Address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Permanent Cadastral Residence Address
                  </label>
                  <input
                    type="text"
                    value={formData.residentialAddress}
                    onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                {/* Additional Editable: Nominee & Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Designated Nominee Name
                    </label>
                    <input
                      type="text"
                      value={formData.primaryNomineeName}
                      onChange={(e) => setFormData({ ...formData, primaryNomineeName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Nominee Relationship
                    </label>
                    <input
                      type="text"
                      value={formData.nomineeRelation}
                      onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Emergency Alert Contact
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Bio / Cadastral Titleholder Note
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-white bg-[#0b6b4e] hover:bg-[#08523c] transition-colors shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Full Name:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email:</span>
                    <span className="font-mono text-slate-900 mt-0.5 block truncate">{formData.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Mobile:</span>
                    <span className="font-mono text-slate-900 mt-0.5 block">{formData.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Aadhaar (e-KYC):</span>
                    <span className="font-mono text-slate-900 mt-0.5 block">{formData.aadharMasked}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">PAN Tax ID:</span>
                    <span className="font-mono text-slate-900 mt-0.5 block">{formData.panNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Role Authority:</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block">Primary Titleholder</span>
                  </div>
                </div>

                {/* Additional Detailed Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">Permanent Cadastral Residence:</span>
                    <p className="text-slate-800 text-[11px] font-medium leading-relaxed">{formData.residentialAddress}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">Designated Nominee & Contact:</span>
                    <div className="text-slate-800 text-[11px] font-medium">
                      {formData.primaryNomineeName} ({formData.nomineeRelation}) • Emergency: {formData.emergencyContact}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cryptographic Sovereign Wallet */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Wallet className="w-4 h-4 text-sky-600" />
                  <span>Ethereum Sovereign Identity Key</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Secp256k1 Bound
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <span className="font-mono text-[11px] text-emerald-700 break-all select-all font-semibold">
                  {sovereignWallet}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0"
                  title="Copy Wallet Address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hardware-anchored key used for non-repudiation and cryptographic validation of Section 5 land titles.
              </p>
            </div>

            {/* Statutory Privileges */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Statutory Registry Capabilities
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {permissions.map((p) => (
                  <div
                    key={p.key}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-[11px]">{p.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column (4 cols): Landholding Summary & Quick Links */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cadastral Ledger Holdings */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Registered Holdings</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
              <div 
                onClick={() => navigate('/citizen/properties')}
                className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 cursor-pointer hover:bg-sky-50 transition-colors"
              >
                <span className="text-[10px] text-slate-500 font-sans block font-medium">Owned</span>
                <span className="font-bold text-sky-700 text-lg">{parcels.length}</span>
              </div>

              <div 
                onClick={() => navigate('/citizen/nominees')}
                className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 cursor-pointer hover:bg-purple-50 transition-colors"
              >
                <span className="text-[10px] text-slate-500 font-sans block font-medium">Nominee</span>
                <span className="font-bold text-purple-700 text-lg">{nomineeProperties.length}</span>
              </div>

              <div 
                onClick={() => navigate('/citizen/transactions?tab=transfers')}
                className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors"
              >
                <span className="text-[10px] text-slate-500 font-sans block font-medium">Petitions</span>
                <span className="font-bold text-amber-700 text-lg">{userTransfers.length}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/citizen/properties')}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer text-center"
            >
              Manage Registered Titles ➔
            </button>
          </div>

          {/* Quick Security Check */}
          <div className="bg-[#0b6b4e] rounded-3xl p-6 text-white space-y-4 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-white">Titleholder e-KYC Verified</h3>
              <p className="text-[11px] text-white/80 leading-relaxed mt-1">
                Your citizen credentials are bound with UIDAI Aadhaar biometrics and registered under Uttar Pradesh Cadastral Authority.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/citizen/settings')}
              className="w-full py-2.5 rounded-xl bg-white text-[#0b6b4e] font-bold text-xs hover:bg-slate-100 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Manage Security Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default CitizenProfilePage;
