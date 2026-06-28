import React from 'react';

export default function Hotbar({ blockTypes, selectedBlock, onSelectBlock }) {
  return (
    <div className="hotbar" id="hotbar">
      {blockTypes.map((type, index) => (
        <div
          key={type.id}
          className={`slot ${index === selectedBlock ? 'selected' : ''}`}
          data-index={index}
          onClick={() => onSelectBlock(index)}
        >
          <span className="slot-key">{index + 1}</span>
          <span className="slot-swatch" style={{ background: type.color }} />
          <span className="slot-name">{type.name}</span>
        </div>
      ))}
    </div>
  );
}
