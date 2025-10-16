import React from 'react'

export type FileTab = { id: string; name: string }

type Props = {
  files: FileTab[]
  activeId: string
  onActivate: (id: string) => void
  onClose: (id: string) => void
}

export default function TabBar({ files, activeId, onActivate, onClose }: Props) {
  return (
    <div className="tab-bar" role="tablist" aria-label="Open files">
      {files.map((f) => (
        <div
          key={f.id}
          role="tab"
          aria-selected={f.id === activeId}
          tabIndex={0}
          className={`tab ${f.id === activeId ? 'active' : ''}`}
          onClick={() => onActivate(f.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onActivate(f.id)
          }}
          title={f.name}
        >
          <span className="tab-name">{f.name}</span>
          <button
            className="tab-close"
            aria-label={`Schließe ${f.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onClose(f.id)
            }}
            title="Tab schließen"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
