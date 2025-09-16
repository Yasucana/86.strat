document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('battlefield');
  const ctx = canvas.getContext('2d');
  const endTurnBtn = document.getElementById('endTurn');
  const unitInfo = document.getElementById('unit-info');

  if (!ctx) {
    console.error('Failed to get 2D context for canvas');
    return;
  }

  // Game constants
  const GRID_SIZE = 40;
  const ROWS = 15;
  const COLS = 20;

  // Unit types
  const UNITS = {
    phalanx: { hp: 100, attack: 20, range: 1, morale: 80, color: 'red' },
    cavalry: { hp: 80, attack: 25, range: 2, morale: 90, color: 'orange' },
    persian_infantry: { hp: 90, attack: 15, range: 1, morale: 70, color: 'blue' }
  };

  // Game state
  let units = [
    { type: 'phalanx', x: 2, y: 12, hp: 100, morale: 80, team: 'player' },
    { type: 'cavalry', x: 4, y: 12, hp: 80, morale: 90, team: 'player' },
    { type: 'persian_infantry', x: 18, y: 2, hp: 90, morale: 70, team: 'ai' }
  ];
  let selectedUnit = null;
  let currentTurn = 'player';
  let needsRedraw = true; // 描画が必要かどうかを管理

  // Draw battlefield grid
  function drawBattlefield() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d2b48c'; // Match CSS background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        ctx.strokeStyle = '#333';
        ctx.strokeRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }
    units.forEach(unit => {
      ctx.fillStyle = UNITS[unit.type].color;
      ctx.fillRect(unit.x * GRID_SIZE + 5, unit.y * GRID_SIZE + 5, 30, 30);
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      ctx.fillText(`HP:${unit.hp} M:${unit.morale}`, unit.x * GRID_SIZE, unit.y * GRID_SIZE + 15);
    });
    console.log('Battlefield drawn');
    needsRedraw = false; // 描画完了
  }

  // Handle unit selection and movement
  canvas.addEventListener('click', (e) => {
    if (currentTurn !== 'player') return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    // グリッド範囲外のクリックを無視
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

    const clickedUnit = units.find(u => u.x === x && u.y === y && u.team === 'player');
    if (clickedUnit) {
      selectedUnit = clickedUnit;
      unitInfo.textContent = `Macedonian ${clickedUnit.type}: HP ${clickedUnit.hp}, Morale ${clickedUnit.morale}`;
      console.log(`Selected unit: ${clickedUnit.type}`);
      return;
    }

    if (selectedUnit) {
      const distance = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
      if (distance <= UNITS[selectedUnit.type].range && !units.some(u => u.x === x && u.y === y)) {
        selectedUnit.x = x;
        selectedUnit.y = y;
        console.log(`Moved ${selectedUnit.type} to (${x}, ${y})`);
        needsRedraw = true;
      }
    }
  });

  // Handle attacks
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!selectedUnit || currentTurn !== 'player') return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    // グリッド範囲外のクリックを無視
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

    const target = units.find(u => u.x === x && u.y === y && u.team === 'ai');
    if (target) {
      const distance = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
      if (distance <= UNITS[selectedUnit.type].range) {
        const damage = UNITS[selectedUnit.type].attack * (selectedUnit.morale / 100);
        target.hp -= damage;
        target.morale -= 20;
        if (target.hp <= 0) {
          units = units.filter(u => u !== target);
          console.log(`${target.type} defeated`);
        }
        if (target.morale <= 20) target.morale = 20;
        unitInfo.textContent = `Attacked Persian ${target.type}! HP: ${target.hp}, Morale: ${target.morale}`;
        console.log(`Attacked ${target.type} for ${damage} damage`);
        needsRedraw = true;
      }
    }
  });

  // AI turn logic
  function aiTurn() {
    units.filter(u => u.team === 'ai').forEach(unit => {
      const target = units.find(u => u.team === 'player' && Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) <= UNITS[unit.type].range);
      if (target) {
        const damage = UNITS[unit.type].attack * (unit.morale / 100);
        target.hp -= damage;
        target.morale -= 15;
        if (target.hp <= 0) {
          units = units.filter(u => u !== target);
          console.log(`${target.type} defeated by AI`);
        }
        if (target.morale <= 20) target.morale = 20;
        unitInfo.textContent = `AI attacked Macedonian ${target.type}! HP: ${target.hp}, Morale: ${target.morale}`;
      } else {
        const nearest = units.filter(u => u.team === 'player').reduce((closest, u) => {
          const dist = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
          return dist < closest.dist ? { unit: u, dist } : closest;
        }, { unit: null, dist: Infinity });
        if (nearest.unit) {
          const newX = unit.x + Math.sign(nearest.unit.x - unit.x);
          const newY = unit.y + Math.sign(nearest.unit.y - unit.y);
          if (!units.some(u => u.x === newX && u.y === newY) && newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS) {
            unit.x = newX;
            unit.y = newY;
            console.log(`AI moved ${unit.type} to (${newX}, ${newY})`);
          }
        }
      }
    });
    currentTurn = 'player';
    unitInfo.textContent = 'Your turn, Macedonian commander!';
    needsRedraw = true;
  }

  // End turn
  endTurnBtn.addEventListener('click', () => {
    if (currentTurn === 'player') {
      currentTurn = 'ai';
      console.log('AI turn started');
      aiTurn();
    }
  });

  // Check game over
  function checkGameOver() {
    if (!units.some(u => u.team === 'ai')) {
      alert('Victory! The Macedonians triumph, as Alexander did at Gaugamela!');
      location.reload();
    } else if (!units.some(u => u.team === 'player')) {
      alert('Defeat! The Persians overwhelm you, unlike the historical outcome.');
      location.reload();
    }
  }

  // Game loop
  function gameLoop() {
    if (needsRedraw) {
      drawBattlefield();
    }
    checkGameOver();
    requestAnimationFrame(gameLoop);
  }

  // Start game
  console.log('Game initialized');
  drawBattlefield();
  gameLoop();
});