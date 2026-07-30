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
        gap: '16px',
        width: '100%',
        height: '100%',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
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
                className="win-btn"
              >
                <ChevronRight size={14} />
              </button>
            ) : undefined
          }
          style={{
            width: inspectorWidth,
            minWidth: inspectorWidth,
            height: '100%',
            overflow: 'hidden',
            flexShrink: 0,
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
          className="win-btn"
          style={{
            width: '28px',
            height: '100%',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={14} />
        </button>
      )}
    </div>
  );
};
