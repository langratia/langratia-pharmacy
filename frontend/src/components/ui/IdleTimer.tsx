import React, { useEffect, useRef, useState } from 'react';

interface IdleTimerProps {
  timeoutMinutes: number;
  onTimeout: () => void;
  warningMinutes?: number;
}

export const IdleTimer: React.FC<IdleTimerProps> = ({
  timeoutMinutes,
  onTimeout,
  warningMinutes = 1,
}) => {
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    if (remaining !== null) setRemaining(null);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    return () => events.forEach((ev) => window.removeEventListener(ev, resetTimer));
  }, []);

  useEffect(() => {
    if (timeoutMinutes <= 0) return;

    const checkInterval = setInterval(() => {
      const elapsed = (Date.now() - lastActivityRef.current) / 1000 / 60;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const elapsedMs = Date.now() - lastActivityRef.current;

      if (elapsedMs >= timeoutMs) {
        onTimeout();
        return;
      }

      if (elapsed >= timeoutMinutes - warningMinutes) {
        const remain = Math.ceil((timeoutMs - elapsedMs) / 1000);
        setRemaining(remain);
      } else {
        setRemaining(null);
      }
    }, 1000);

    timerRef.current = checkInterval;
    return () => clearInterval(checkInterval);
  }, [timeoutMinutes, warningMinutes, onTimeout]);

  if (remaining === null) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'var(--color-warning-bg, #fff3cd)',
        borderBottom: '1px solid var(--color-warning-border, #ffc107)',
        color: 'var(--color-warning-text, #856404)',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      Session expires in {remaining} second{remaining !== 1 ? 's' : ''} due to inactivity
    </div>
  );
};
