import React from 'react';

const STEPS = [
  { step: 1, key: 'submitted', title: 'Submitted', subtitle: 'Application & Docs Received' },
  { step: 2, key: 'processing', title: 'Processing', subtitle: 'Registrar Review & RFID Encoding' },
  { step: 3, key: 'ready', title: 'Ready for Pickup', subtitle: 'Available at Window 4' },
  { step: 4, key: 'released', title: 'Released', subtitle: 'Card Claimed by Student' },
];

export function getStepIndex(status) {
  const s = status?.toLowerCase();
  if (s === 'submitted') return 0;
  if (s === 'processing') return 1;
  if (s === 'ready') return 2;
  if (s === 'released') return 3;
  return -1;
}

function StatusStepper({ currentStatus, size = 'normal', showLabels = true, onStepClick }) {
  const currentIdx = getStepIndex(currentStatus);
  const isRejected = currentStatus?.toLowerCase() === 'rejected';

  // Sizing configurations
  const configs = {
    small: {
      circleSize: 26,
      fontSize: '0.72rem',
      lineHeight: '3px',
      labelFontSize: '0.68rem',
      gap: '6px',
      showSubtitles: false,
    },
    normal: {
      circleSize: 36,
      fontSize: '0.9rem',
      lineHeight: '4px',
      labelFontSize: '0.78rem',
      gap: '8px',
      showSubtitles: false,
    },
    large: {
      circleSize: 56,
      fontSize: '1.25rem',
      lineHeight: '6px',
      labelFontSize: '0.92rem',
      gap: '12px',
      showSubtitles: true,
    }
  };

  const config = configs[size] || configs.normal;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: config.gap }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        width: '100%'
      }}>
        {STEPS.map((s, idx) => {
          const isCompleted = !isRejected && currentIdx > idx;
          const isCurrent = !isRejected && currentIdx === idx;

          // Colors
          let circleBg = '#2d2c30';
          let circleBorder = '#4a484e';
          let textColor = '#9ca3af';
          let shadow = 'none';

          if (isCompleted) {
            circleBg = 'linear-gradient(135deg, rgb(16, 185, 129), rgb(5, 150, 105))';
            circleBorder = '#10b981';
            textColor = '#ffffff';
            shadow = '0 0 10px rgba(16, 185, 129, 0.4)';
          } else if (isCurrent) {
            circleBg = 'linear-gradient(135deg, rgb(239, 68, 68), rgb(185, 28, 28))';
            circleBorder = '#fca5a5';
            textColor = '#ffffff';
            shadow = '0 0 18px rgba(239, 68, 68, 0.65)';
          }

          const isNextCompleted = !isRejected && currentIdx > idx;

          return (
            <React.Fragment key={s.step}>
              {/* Step Circle with Number inside */}
              <div
                onClick={() => onStepClick?.(s, idx)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: onStepClick ? 'pointer' : 'default',
                  zIndex: 2,
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${config.circleSize}px`,
                    height: `${config.circleSize}px`,
                    borderRadius: '50%',
                    background: circleBg,
                    border: `${size === 'large' ? '3px' : '2px'} solid ${circleBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: config.fontSize,
                    color: textColor,
                    boxShadow: shadow,
                    transition: 'all 0.3s ease',
                    transform: isCurrent ? 'scale(1.12)' : 'scale(1)',
                  }}
                  title={`Step ${s.step}: ${s.title}`}
                >
                  {isCompleted ? (
                    <i className="fa-solid fa-check" style={{ fontSize: `calc(${config.fontSize} * 0.95)` }}></i>
                  ) : (
                    <span>{s.step}</span>
                  )}
                </div>

                {/* Optional ripple/pulse effect for active step in large mode */}
                {isCurrent && size === 'large' && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    right: '-4px',
                    bottom: '-4px',
                    borderRadius: '50%',
                    border: '2px solid rgba(239, 68, 68, 0.5)',
                    animation: 'pulse 1.8s infinite',
                    pointerEvents: 'none'
                  }} />
                )}
              </div>

              {/* Connecting line between circles */}
              {idx < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: config.lineHeight,
                    background: isNextCompleted
                      ? 'linear-gradient(90deg, #10b981, #10b981)'
                      : (isCurrent
                          ? 'linear-gradient(90deg, rgb(239, 68, 68), #3e3c42)'
                          : '#3e3c42'),
                    margin: size === 'small' ? '0 4px' : '0 10px',
                    borderRadius: '4px',
                    transition: 'background 0.3s ease',
                    zIndex: 1
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Labels Below */}
      {showLabels && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          marginTop: size === 'large' ? '10px' : '5px',
          textAlign: 'center'
        }}>
          {STEPS.map((s, idx) => {
            const isCompleted = !isRejected && currentIdx > idx;
            const isCurrent = !isRejected && currentIdx === idx;

            let labelColor = 'rgba(255, 255, 255, 0.7)';
            let fontWeight = 500;

            if (isCompleted) {
              labelColor = '#34d399';
              fontWeight = 600;
            } else if (isCurrent) {
              labelColor = '#ffffff';
              fontWeight = 700;
            }

            const labelWidth = size === 'small' ? 76 : (size === 'large' ? 140 : 90);
            const edgeOffset = `${(config.circleSize - labelWidth) / 2}px`;

            return (
              <div
                key={s.step}
                style={{
                  width: `${labelWidth}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginLeft: idx === 0 ? edgeOffset : 0,
                  marginRight: idx === STEPS.length - 1 ? edgeOffset : 0,
                }}
              >
                <span style={{
                  fontSize: config.labelFontSize,
                  color: labelColor,
                  fontWeight,
                  letterSpacing: '0.02em',
                  lineHeight: 1.2
                }}>
                  {s.title}
                </span>
                {config.showSubtitles && (
                  <span style={{
                    fontSize: '0.72rem',
                    color: isCurrent ? '#fca5a5' : '#9ca3af',
                    marginTop: '4px',
                    lineHeight: 1.2
                  }}>
                    {s.subtitle}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StatusStepper;
