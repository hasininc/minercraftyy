import React from 'react';

export default function HUD({ selectedBlockName, hintText, positionRef }) {
  return (
    <div className="hud">
      <div className="brand">
        <h1>BlockCraft Web</h1>
        <p>A tiny browser sandbox inspired by Minecraft.</p>
      </div>

      <div className="panel controls">
        <h2>Controls</h2>
        <p><span>Move</span><strong>W A S D</strong></p>
        <p><span>Jump</span><strong>Space</strong></p>
        <p><span>Look</span><strong>Mouse</strong></p>
        <p><span>Break block</span><strong>Left click</strong></p>
        <p><span>Place block</span><strong>Right click</strong></p>
        <p><span>Switch block</span><strong>1 - 5</strong></p>
      </div>

      <div className="panel stats">
        <h2>Status</h2>
        <p><span>Selected</span><strong>{selectedBlockName}</strong></p>
        <p><span>Position</span><strong ref={positionRef}>0.0, 0.0, 0.0</strong></p>
        <p><span>Hint</span><strong>{hintText}</strong></p>
      </div>
    </div>
  );
}
