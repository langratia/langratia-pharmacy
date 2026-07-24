import React from 'react';
import { Panel } from './Panel';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface SplitPaneProps {
  primaryPane: React.ReactNode;
  inspectorPane: React.ReactNode;
  inspectorTitle?: string;
  inspectorWidth?: string; // e.g. "360px" or "32%"
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  style?: React.CSSProperties;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  primaryPane,
  inspectorPane,
  inspectorTitle = 'Inspector Panel',
  inspectorWidth = '350px',
  isInspectorOpen = true,
  onToggleInspector,
  style
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        width: '100%',
        height: '100%',
        flex: 1,
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Primary Workspace Master Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {primaryPane}
      </div>

      {/* Docked Inspector Detail Pane */}
      {isInspectorOpen && (
        <Panel
          title={inspectorTitle}
          actions={
            onToggleInspector ? (
              <button
                onClick={onToggleInspector}
                title="Collapse Inspector"
                style={{
                  width: '20px',
                  height: '20px',
                  padding: 0,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight size={14} />
              </button>
            ) : undefined
          }
          style={{
            width: inspectorWidth,
            minWidth: inspectorWidth,
            height: '100%',
            overflow: 'hidden'
          }}
          noPadding
        >
          {inspectorPane}
        </Panel>
      )}

      {!isInspectorOpen && onToggleInspector && (
        <button
          onClick={onToggleInspector}
          title="Open Inspector Panel"
          style={{
            width: '24px',
            height: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          <ChevronLeft size={14} />
        </button>
      )}
    </div>
  );
};
