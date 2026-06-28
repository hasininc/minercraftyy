import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Hotbar from './components/Hotbar';

const blockTypes = [
  { id: "grass", name: "Grass", color: "#50a721ff" },
  { id: "dirt", name: "Dirt", color: "#8d5a35" },
  { id: "stone", name: "Stone", color: "#8f9aa3" },
  { id: "sand", name: "Sand", color: "#d8c27a" },
  { id: "wood", name: "Wood", color: "#9b6b3f" },
];

export default function App() {
  const [selectedBlock, setSelectedBlock] = useState(0);
  const [hintText, setHintText] = useState("Click the world to lock the mouse");
  const positionRef = useRef(null);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const canvas = document.getElementById("game");
      if (document.pointerLockElement === canvas) {
        setHintText("Mouse locked. Explore and build.");
      } else {
        setHintText("Click the world to lock the mouse");
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, []);

  return (
    <>
      <GameCanvas
        blockTypes={blockTypes}
        selectedBlock={selectedBlock}
        onSelectBlock={setSelectedBlock}
        onHintChange={setHintText}
        positionRef={positionRef}
      />
      <HUD
        selectedBlockName={blockTypes[selectedBlock].name}
        hintText={hintText}
        positionRef={positionRef}
      />
      <div className="crosshair" aria-hidden="true" />
      <Hotbar
        blockTypes={blockTypes}
        selectedBlock={selectedBlock}
        onSelectBlock={setSelectedBlock}
      />
    </>
  );
}
