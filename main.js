const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const positionReadout = document.getElementById("position-readout");
const selectedBlockReadout = document.getElementById("selected-block");
const hintReadout = document.getElementById("hint-readout");
const hotbar = document.getElementById("hotbar");

const WORLD_SIZE = 100;
const WORLD_HEIGHT = 12;
const RENDER_DISTANCE = 20;
const GRAVITY = 22;
const JUMP_SPEED = 8.5;
const WALK_SPEED = 5.4;
const PLAYER_RADIUS = 0.32;
const PLAYER_HEIGHT = 1.7;
const EYE_HEIGHT = 1.55;
const BLOCK_SIZE = 1;

const blockTypes = [
  { id: "grass", name: "Grass", color: "#50a721ff" },
  { id: "dirt", name: "Dirt", color: "#8d5a35" },
  { id: "stone", name: "Stone", color: "#8f9aa3" },
  { id: "sand", name: "Sand", color: "#d8c27a" },
  { id: "wood", name: "Wood", color: "#9b6b3f" },
];

const blockIndex = new Map(blockTypes.map((type) => [type.id, type]));
const world = new Map();
const keys = new Set();

const player = {
  x: WORLD_SIZE / 2,
  y: 7,
  z: WORLD_SIZE / 2,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: Math.PI / 4,
  pitch: -0.3,
  onGround: false,
};

let selectedBlock = 0;
let highlighted = null;
let lastTime = performance.now();

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function worldKey(x, y, z) {
  return `${x},${y},${z}`;
}

function setBlock(x, y, z, type) {
  const key = worldKey(x, y, z);
  if (type) {
    world.set(key, type);
  } else {
    world.delete(key);
  }
}

function getBlock(x, y, z) {
  return world.get(worldKey(x, y, z)) || null;
}

function buildWorld() {
  world.clear();

  for (let x = 0; x < WORLD_SIZE; x += 1) {
    for (let z = 0; z < WORLD_SIZE; z += 1) {
      const height =
        3 +
        Math.floor(
          Math.sin(x * 0.12) * 2.2 +
            Math.cos(z * 0.09) * 2.2 +
            Math.sin((x + z) * 0.05) * 1.5 +
            3.1,
        );

      for (let y = 0; y <= Math.min(height, WORLD_HEIGHT); y += 1) {
        let type = "stone";
        if (y === height) type = height <= 2 ? "sand" : "grass";
        else if (y >= height - 2) type = "dirt";

        setBlock(x, y, z, type);
      }

      if ((x + z) % 11 === 0 && height >= 4) {
        for (let trunk = 1; trunk <= 2; trunk += 1) {
          setBlock(x, height + trunk, z, "wood");
        }
        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oz = -1; oz <= 1; oz += 1) {
            if (Math.abs(ox) + Math.abs(oz) < 3) {
              setBlock(x + ox, height + 3, z + oz, "grass");
            }
          }
        }
      }
    }
  }

  const startHeight = findGround(player.x, player.z);
  player.y = startHeight + 3;
}

function findGround(x, z) {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let y = WORLD_HEIGHT + 4; y >= 0; y -= 1) {
    if (getBlock(bx, y, bz)) {
      return y + 1;
    }
  }
  return 4;
}

function createHotbar() {
  hotbar.innerHTML = "";
  blockTypes.forEach((type, index) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = String(index);
    slot.innerHTML = `
      <span class="slot-key">${index + 1}</span>
      <span class="slot-swatch" style="background:${type.color}"></span>
      <span class="slot-name">${type.name}</span>
    `;
    hotbar.appendChild(slot);
  });
  updateHotbar();
}

function updateHotbar() {
  [...hotbar.children].forEach((slot, index) => {
    slot.classList.toggle("selected", index === selectedBlock);
  });
  selectedBlockReadout.textContent = blockTypes[selectedBlock].name;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getLookVector() {
  const cp = Math.cos(player.pitch);
  return {
    x: -Math.sin(player.yaw) * cp,
    y: -Math.sin(player.pitch),
    z: Math.cos(player.yaw) * cp,
  };
}

function collidesAt(x, y, z) {
  const minX = Math.floor(x - PLAYER_RADIUS);
  const maxX = Math.floor(x + PLAYER_RADIUS);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + PLAYER_HEIGHT);
  const minZ = Math.floor(z - PLAYER_RADIUS);
  const maxZ = Math.floor(z + PLAYER_RADIUS);

  for (let bx = minX; bx <= maxX; bx += 1) {
    for (let by = minY; by <= maxY; by += 1) {
      for (let bz = minZ; bz <= maxZ; bz += 1) {
        if (getBlock(bx, by, bz)) {
          return true;
        }
      }
    }
  }
  return false;
}

function updatePlayer(dt) {
  let moveX = 0;
  let moveZ = 0;
  if (keys.has("KeyW")) moveZ += 1;
  if (keys.has("KeyS")) moveZ -= 1;
  if (keys.has("KeyA")) moveX -= 1;
  if (keys.has("KeyD")) moveX += 1;

  if (moveX !== 0 || moveZ !== 0) {
    const length = Math.hypot(moveX, moveZ) || 1;
    moveX /= length;
    moveZ /= length;

    const forwardX = -Math.sin(player.yaw);
    const forwardZ = Math.cos(player.yaw);

    const rightX = Math.cos(player.yaw);
    const rightZ = Math.sin(player.yaw);

const targetVX = (forwardX * moveZ + rightX * moveX) * WALK_SPEED;
const targetVZ = (forwardZ * moveZ + rightZ * moveX) * WALK_SPEED;

player.vx += (targetVX - player.vx) * 10 * dt;
player.vz += (targetVZ - player.vz) * 10 * dt;


  } else {
    player.vx = 0;
    player.vz = 0;
  }

  if (keys.has("Space") && player.onGround) {
    player.vy = JUMP_SPEED;
    player.onGround = false;
  }

  player.vy -= GRAVITY * dt;

  const nextX = player.x + player.vx * dt;
  if (!collidesAt(nextX, player.y, player.z)) {
    player.x = nextX;
  }

  const nextZ = player.z + player.vz * dt;
  if (!collidesAt(player.x, player.y, nextZ)) {
    player.z = nextZ;
  }

  const nextY = player.y + player.vy * dt;
  if (!collidesAt(player.x, nextY, player.z)) {
    player.y = nextY;
    player.onGround = false;
  } else {
    if (player.vy < 0) {
      player.onGround = true;
      player.y = Math.floor(player.y + 0.001) + 0.001;
    }
    player.vy = 0;
  }

  player.x = clamp(player.x, 1, WORLD_SIZE - 1);
  player.z = clamp(player.z, 1, WORLD_SIZE - 1);

  if (player.y < -10) {
    player.x = WORLD_SIZE / 2;
    player.z = WORLD_SIZE / 2;
    player.y = findGround(player.x, player.z) + 3;
    player.vy = 0;
  }

  positionReadout.textContent = `${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`;
}

function projectPoint(point) {
  const cx = point.x - player.x;
  const cy = point.y - (player.y + EYE_HEIGHT);
  const cz = point.z - player.z;

  const sinYaw = Math.sin(-player.yaw);
  const cosYaw = Math.cos(-player.yaw);
  const rx = cx * cosYaw - cz * sinYaw;
  const rz = cx * sinYaw + cz * cosYaw;

  const sinPitch = Math.sin(-player.pitch);
  const cosPitch = Math.cos(-player.pitch);
  const ry = cy * cosPitch - rz * sinPitch;
  const rz2 = cy * sinPitch + rz * cosPitch;

  if (rz2 <= 0.1) {
    return null;
  }

  const focal = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  const scale = focal / rz2;

  return {
    x: window.innerWidth / 2 + rx * scale,
    y: window.innerHeight / 2 - ry * scale,
    depth: rz2,
  };
}

function blockVertices(x, y, z) {
  return [
    { x, y, z },
    { x: x + BLOCK_SIZE, y, z },
    { x: x + BLOCK_SIZE, y: y + BLOCK_SIZE, z },
    { x, y: y + BLOCK_SIZE, z },
    { x, y, z: z + BLOCK_SIZE },
    { x: x + BLOCK_SIZE, y, z: z + BLOCK_SIZE },
    { x: x + BLOCK_SIZE, y: y + BLOCK_SIZE, z: z + BLOCK_SIZE },
    { x, y: y + BLOCK_SIZE, z: z + BLOCK_SIZE },
  ];
}

const faceDefinitions = [
  { name: "north", indices: [0, 1, 2, 3], neighbor: [0, 0, -1], shade: 0.9, normal: [0, 0, -1] },
  { name: "south", indices: [5, 4, 7, 6], neighbor: [0, 0, 1], shade: 1.05, normal: [0, 0, 1] },
  { name: "west", indices: [4, 0, 3, 7], neighbor: [-1, 0, 0], shade: 0.82, normal: [-1, 0, 0] },
  { name: "east", indices: [1, 5, 6, 2], neighbor: [1, 0, 0], shade: 0.95, normal: [1, 0, 0] },
  { name: "bottom", indices: [4, 5, 1, 0], neighbor: [0, -1, 0], shade: 0.65, normal: [0, -1, 0] },
  { name: "top", indices: [3, 2, 6, 7], neighbor: [0, 1, 0], shade: 1.2, normal: [0, 1, 0] },
];

function shadeColor(hex, amount) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const clampChannel = (channel) => clamp(Math.round(channel * amount), 0, 255);
  return `rgb(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)})`;
}

function getVisibleFaces() {
  const faces = [];
  const px = Math.floor(player.x);
  const pz = Math.floor(player.z);

  for (let x = px - RENDER_DISTANCE; x <= px + RENDER_DISTANCE; x += 1) {
    for (let z = pz - RENDER_DISTANCE; z <= pz + RENDER_DISTANCE; z += 1) {
      for (let y = 0; y <= WORLD_HEIGHT + 4; y += 1) {
        const typeId = getBlock(x, y, z);
        if (!typeId) continue;

        const block = blockIndex.get(typeId);
        const verts = blockVertices(x, y, z);

        for (const face of faceDefinitions) {
          const [nx, ny, nz] = face.neighbor;
          if (getBlock(x + nx, y + ny, z + nz)) continue;

          const center = {
            x: x + 0.5 + nx * 0.5,
            y: y + 0.5 + ny * 0.5,
            z: z + 0.5 + nz * 0.5,
          };
          const toCamera = {
            x: player.x - center.x,
            y: player.y + EYE_HEIGHT - center.y,
            z: player.z - center.z,
          };
          const facing =
            toCamera.x * face.normal[0] +
            toCamera.y * face.normal[1] +
            toCamera.z * face.normal[2];
          if (facing <= 0) continue;

          const projected = face.indices.map((index) => projectPoint(verts[index]));
          if (projected.some((point) => point === null)) continue;

          const depth =
            projected.reduce((total, point) => total + point.depth, 0) /
            projected.length;

          faces.push({
            points: projected,
            depth,
            color: shadeColor(block.color, face.shade),
            outline: highlighted && highlighted.block.x === x && highlighted.block.y === y && highlighted.block.z === z && highlighted.face === face.name,
          });
        }
      }
    }
  }

  faces.sort((a, b) => b.depth - a.depth);
  return faces;
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, "#8fd3ff");
  gradient.addColorStop(1, "#ebfbff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < 6; i += 1) {
    const x = (i * 210 + performance.now() * 0.01) % (window.innerWidth + 220) - 110;
    const y = 50 + (i % 3) * 45;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 10, 24, 0, Math.PI * 2);
    ctx.arc(x + 44, y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWorld() {
  drawSky();

  const faces = getVisibleFaces();
  for (const face of faces) {
    ctx.beginPath();
    face.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = face.color;
    ctx.fill();
    ctx.strokeStyle = face.outline ? "#ffe27a" : "rgba(17, 24, 39, 0.22)";
    ctx.lineWidth = face.outline ? 3 : 1;
    ctx.stroke();
  }
}

function raycast(maxDistance = 8) {
  const direction = getLookVector();
  let previous = null;

  for (let step = 0; step < maxDistance * 20; step += 1) {
    const distance = step * 0.05;
    const x = player.x + direction.x * distance;
    const y = player.y + EYE_HEIGHT + direction.y * distance;
    const z = player.z + direction.z * distance;

    const cell = {
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z),
    };

    if (!previous || previous.x !== cell.x || previous.y !== cell.y || previous.z !== cell.z) {
      const block = getBlock(cell.x, cell.y, cell.z);
      if (block) {
        const normal = previous
          ? {
              x: previous.x - cell.x,
              y: previous.y - cell.y,
              z: previous.z - cell.z,
            }
          : { x: 0, y: 1, z: 0 };
        return {
          block: cell,
          previous,
          normal,
          face: normalToFace(normal),
        };
      }
      previous = cell;
    }
  }

  return null;
}

function normalToFace(normal) {
  if (normal.x === 1) return "east";
  if (normal.x === -1) return "west";
  if (normal.y === 1) return "top";
  if (normal.y === -1) return "bottom";
  if (normal.z === 1) return "south";
  return "north";
}

function breakBlock() {
  highlighted = raycast();
  if (!highlighted) return;
  const { x, y, z } = highlighted.block;
  setBlock(x, y, z, null);
}

function placeBlock() {
  highlighted = raycast();
  if (!highlighted || !highlighted.previous) return;
  const { x, y, z } = highlighted.previous;

  if (y < 0 || y > WORLD_HEIGHT + 5) return;
  if (blockIntersectsPlayer(x, y, z)) return;

  setBlock(x, y, z, blockTypes[selectedBlock].id);
}

function blockIntersectsPlayer(x, y, z) {
  const playerMinX = player.x - PLAYER_RADIUS;
  const playerMaxX = player.x + PLAYER_RADIUS;
  const playerMinY = player.y;
  const playerMaxY = player.y + PLAYER_HEIGHT;
  const playerMinZ = player.z - PLAYER_RADIUS;
  const playerMaxZ = player.z + PLAYER_RADIUS;

  return !(
    x + 1 <= playerMinX ||
    x >= playerMaxX ||
    y + 1 <= playerMinY ||
    y >= playerMaxY ||
    z + 1 <= playerMinZ ||
    z >= playerMaxZ
  );
}

function render() {
  highlighted = raycast();
  drawWorld();
}

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  updatePlayer(dt);
  render();

  requestAnimationFrame(tick);
}

document.addEventListener("keydown", (event) => {
  if (["Space", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (/Digit[1-5]/.test(event.code)) {
    selectedBlock = Number(event.code.replace("Digit", "")) - 1;
    updateHotbar();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    hintReadout.textContent = "Mouse locked. Explore and build.";
  } else {
    hintReadout.textContent = "Click the world to lock the mouse";
  }
});

document.addEventListener("mousemove", e => {
  if (document.pointerLockElement !== canvas) return;

  const sensitivity = 0.0025;

  // Horizontal (fixed)
  player.yaw -= e.movementX * sensitivity;

  // Vertical (FIXED — no inversion)
  player.pitch += e.movementY * sensitivity;

  // Clamp so you don’t flip upside down
  player.pitch = clamp(player.pitch, -1.3, 1.3);
});

canvas.addEventListener("mousedown", (event) => {
  if (document.pointerLockElement !== canvas) return;
  if (event.button === 0) {
    breakBlock();
  }
  if (event.button === 2) {
    placeBlock();
  }
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("resize", resizeCanvas);

buildWorld();
createHotbar();
resizeCanvas();
requestAnimationFrame(tick);
