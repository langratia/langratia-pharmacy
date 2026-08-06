import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Copy, CheckCircle2, Globe, ArrowRight, Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import langratiaLogo from '../../assets/langratia-logo.png';

interface ActivationPageProps {
  machineId: string;
  lockReason: string;
  onActivated: () => void;
}

export const ActivationPage: React.FC<ActivationPageProps> = ({ machineId, lockReason, onActivated }) => {
  const [licenseParts, setLicenseParts] = useState<string[]>(Array(16).fill(''));
  const [isActivating, setIsActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Animation states
  const [isPastedGlow, setIsPastedGlow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus the first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    toast.success('Machine ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Only allow single character
    if (value.length > 1) return;

    const newParts = [...licenseParts];
    newParts[index] = value;
    setLicenseParts(newParts);

    // Auto-advance to next empty slot
    if (value && index < 15) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !licenseParts[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 15) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (pastedData) {
      const newParts = [...licenseParts];
      for (let i = 0; i < Math.min(pastedData.length, 16); i++) {
        newParts[i] = pastedData[i];
      }
      setLicenseParts(newParts);
      
      // Trigger paste glow
      setIsPastedGlow(true);
      setTimeout(() => setIsPastedGlow(false), 800);

      // Focus last filled or the very last input
      const lastFilledIndex = Math.min(pastedData.length - 1, 15);
      if (lastFilledIndex >= 0) {
        inputRefs.current[lastFilledIndex]?.focus();
      }
    }
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullKey = licenseParts.join('');
    if (fullKey.length !== 16) {
      toast.error('Please enter the full 16-character license key.');
      return;
    }

    setIsActivating(true);
    setStatus('verifying');

    try {
      const wailsApp = (window as any).go?.main?.App;
      if (!wailsApp) throw new Error('Application runtime not available');
      
      // Format with dashes as expected by some systems: XXXX-XXXX-XXXX-XXXX
      const formattedKey = `${fullKey.slice(0,4)}-${fullKey.slice(4,8)}-${fullKey.slice(8,12)}-${fullKey.slice(12,16)}`;
      
      await wailsApp.ActivateLicense(formattedKey);
      
      setStatus('success');
      toast.success('License activated successfully!');
      setTimeout(() => onActivated(), 1500); // Wait for success animation
    } catch (err: any) {
      setStatus('error');
      toast.error(err?.message || 'Invalid license key');
      setTimeout(() => setStatus('idle'), 800); // Reset after shake animation
    } finally {
      setIsActivating(false);
    }
  };

  const getBorderColor = () => {
    if (status === 'verifying') return 'rgba(14, 165, 233, 0.8)';
    if (status === 'success') return 'rgba(52, 211, 153, 0.8)';
    if (status === 'error') return 'rgba(239, 68, 68, 0.8)';
    if (isPastedGlow) return 'rgba(139, 92, 246, 0.8)';
    return '#334155';
  };

  const getShadowGlow = () => {
    if (status === 'verifying') return '0 0 15px rgba(14, 165, 233, 0.4)';
    if (status === 'success') return '0 0 20px rgba(52, 211, 153, 0.5)';
    if (status === 'error') return '0 0 15px rgba(239, 68, 68, 0.5)';
    if (isPastedGlow) return '0 0 25px rgba(139, 92, 246, 0.6)';
    return 'none';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #090d16 0%, #030712 100%)',
      padding: '20px',
      fontFamily: '"Nunito", "Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient glows */}
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(14,165,233,0.03) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #1e293b',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(14, 165, 233, 0.1)',
          color: '#f8fafc',
          position: 'relative',
          zIndex: 1
        }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            style={{
              width: '80px', height: '80px', borderRadius: '20px',
              background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px', boxSizing: 'border-box',
              boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.25)', marginBottom: '16px',
            }}>
            <img src={langratiaLogo} alt="Langratia Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
          </motion.div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Lock size={22} color="#38bdf8" />
            System Locked
          </h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Hardware node-locked protection enabled. Enter your 16-character license key to activate the POS system.
          </p>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '28px'
        }}>
          <ShieldAlert color="#f87171" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#f87171', fontSize: '13px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Action Required
            </div>
            <div style={{ color: '#fca5a5', fontSize: '13px', lineHeight: 1.4 }}>
              {lockReason || "No valid cryptographic license found for this machine."}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Physical Machine ID
          </label>
          <div style={{
            display: 'flex',
            background: '#030712',
            borderRadius: '10px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <input 
              type="text" 
              readOnly 
              value={machineId}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                padding: '12px 14px', fontSize: '14px',
                color: '#38bdf8', outline: 'none', fontFamily: 'monospace'
              }}
            />
            <button 
              onClick={handleCopy}
              style={{
                border: 'none', background: '#1e293b', padding: '0 16px',
                cursor: 'pointer', borderLeft: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: copied ? '#34d399' : '#94a3b8',
                transition: 'all 0.2s'
              }}
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#94a3b8', fontSize: '12px' }}>
            <Globe size={14} color="#38bdf8" />
            <span>Generate key online at: <strong style={{ color: '#38bdf8' }}>distribution.langratia.com/activate</strong></span>
          </div>
        </div>

        <form onSubmit={handleActivate}>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <KeyRound size={14} color="#cbd5e1" />
              Cryptographic License Key
            </label>
            
            <motion.div 
              animate={status === 'error' ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              style={{ 
                display: 'flex', 
                gap: '8px', 
                justifyContent: 'space-between',
                flexWrap: 'wrap'
              }}
            >
              {Array(4).fill(0).map((_, groupIndex) => (
                <div key={groupIndex} style={{ display: 'flex', gap: '6px' }}>
                  {Array(4).fill(0).map((_, charIndex) => {
                    const globalIndex = groupIndex * 4 + charIndex;
                    return (
                      <motion.input
                        key={globalIndex}
                        ref={(el: HTMLInputElement | null) => {
                          if (el) inputRefs.current[globalIndex] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={licenseParts[globalIndex]}
                        onChange={(e) => handleInputChange(globalIndex, e)}
                        onKeyDown={(e) => handleKeyDown(globalIndex, e)}
                        onPaste={handlePaste}
                        animate={{
                          borderColor: getBorderColor(),
                          boxShadow: getShadowGlow(),
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          width: '38px',
                          height: '46px',
                          background: '#030712',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '18px',
                          fontWeight: 700,
                          color: status === 'success' ? '#34d399' : status === 'error' ? '#f87171' : '#f8fafc',
                          textAlign: 'center',
                          outline: 'none',
                          fontFamily: 'monospace',
                          transition: 'background 0.2s',
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#0f172a';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = '#030712';
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.button
            whileHover={(!isActivating && licenseParts.join('').length === 16) ? { scale: 1.02 } : {}}
            whileTap={(!isActivating && licenseParts.join('').length === 16) ? { scale: 0.98 } : {}}
            type="submit"
            disabled={isActivating || licenseParts.join('').length !== 16}
            style={{
              width: '100%', height: '50px', borderRadius: '12px',
              background: status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : '#0ea5e9',
              color: '#FFFFFF', border: 'none',
              fontSize: '15px', fontWeight: 700,
              cursor: (isActivating || licenseParts.join('').length !== 16) ? 'not-allowed' : 'pointer',
              opacity: (isActivating || licenseParts.join('').length !== 16) ? 0.6 : 1,
              boxShadow: status === 'success' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : status === 'error' ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(14, 165, 233, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <AnimatePresence mode="wait">
              {status === 'verifying' ? (
                <motion.span
                  key="verifying"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                  Verifying Key...
                </motion.span>
              ) : status === 'success' ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <CheckCircle2 size={18} />
                  System Unlocked
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Authenticate & Unlock System
                  <ArrowRight size={17} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
