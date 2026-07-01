const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

var loop;
var menu = true;
var lastmenu = true;

const screenw = 400;
const screenh = 300;

var speed = 5;
var shipSpeed = speed;
var gravity = 0.5;
var counter = 0; //gravity portal Iframes

var gamemode = "wave";

const gridSize = 25;

const playerxoffset = 4 * gridSize;
var playerx = 0;
var playery = 0;
const playerwidth = gridSize * 0.75;
const playerheight = gridSize * 0.75;

var noclip = false;
var macro = false;
var selectedlevelnum = 4;

var levelposition = 0;

var trailpositions = [];
const MAX_TRAIL_LENGTH = 30;

var obstacleMode = 0; // 0 blocks, 1 triangles

let obstacles = [];
const OBSTACLE_SIZE = gridSize;

function spawnObstacle(_x, _y, type = 'cube') {
  obstacles.push({
    x: _x,
    y: _y,
    width: OBSTACLE_SIZE,
    height: OBSTACLE_SIZE,
    type: type // FIXED: Sets type explicitly so rendering logic catches it
  });
}
function handleAndDrawObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    let drawX = obs.x - levelposition;

    // --- DRAWING LOGIC ---
    ctx.fillStyle = '#FF4136';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    if (obs.type === 'cube') {
      ctx.fillRect(drawX, obs.y, obs.width, obs.height);
      ctx.strokeRect(drawX, obs.y, obs.width, obs.height);
    } else if (obs.type === 'end') {
      ctx.fillStyle = 'yellow';
      ctx.fillRect(drawX, obs.y, obs.width, obs.height);
      ctx.strokeRect(drawX, obs.y, obs.width, obs.height);
    } else if (obs.type === 'uGrav') {
      ctx.fillStyle = 'gold';
      ctx.fillRect(drawX, obs.y, obs.width, (obs.height));
      ctx.strokeRect(drawX, obs.y, obs.width, (obs.height));
    } else if (obs.type === 'dGrav') {
      ctx.fillStyle = 'blue';
      ctx.fillRect(drawX, obs.y, obs.width, (obs.height+50));
      ctx.strokeRect(drawX, obs.y, obs.width, (obs.height+50));
    } else if (obs.type === 'miniSize') {
      ctx.fillStyle = 'pink';
      ctx.fillRect(drawX, obs.y, obs.width, (obs.height));
      ctx.strokeRect(drawX, obs.y, obs.width, (obs.height));
    } else if (obs.type === 'normalSize') {
      ctx.fillStyle = 'purple';
      ctx.fillRect(drawX, obs.y, obs.width, (obs.height));
      ctx.strokeRect(drawX, obs.y, obs.width, (obs.height));
    } else if (obs.type === 'bigSize') {
      ctx.fillStyle = 'lime';
      ctx.fillRect(drawX, obs.y, obs.width, (obs.height));
      ctx.strokeRect(drawX, obs.y, obs.width, (obs.height));
    } else {
      // Draw 1:1 right-angle triangles using paths
      ctx.beginPath();
      if (obs.type === 'tr_bl') { // Corner Bottom-Left
        ctx.moveTo(drawX, obs.y);
        ctx.lineTo(drawX, obs.y + obs.height);
        ctx.lineTo(drawX + obs.width, obs.y + obs.height);
      } else if (obs.type === 'tr_br') { // Corner Bottom-Right
        ctx.moveTo(drawX + obs.width, obs.y);
        ctx.lineTo(drawX + obs.width, obs.y + obs.height);
        ctx.lineTo(drawX, obs.y + obs.height);
      } else if (obs.type === 'tr_tl') { // Corner Top-Left
        ctx.moveTo(drawX, obs.y + obs.height);
        ctx.lineTo(drawX, obs.y);
        ctx.lineTo(drawX + obs.width, obs.y);
      } else if (obs.type === 'tr_tr') { // Corner Top-Right
        ctx.moveTo(drawX, obs.y);
        ctx.lineTo(drawX + obs.width, obs.y);
        ctx.lineTo(drawX + obs.width, obs.y + obs.height);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // --- COLLISION LOGIC --- //
    // First step: broad AABB check (is the player even touching the general tile zone?)
    let boxCollision = (
      playerx < drawX + obs.width &&
      playerx + playerwidth > drawX &&
      playery < obs.y + obs.height &&
      playery + playerheight > obs.y
    );

    if (boxCollision) {
      if (obs.type === 'cube' && !noclip) {
        menu = true; // Instant crash for basic block
	gravity = 1;
      } else if (obs.type === 'end') {
        menu = true; // win condition
	gravity = 1;
      } else if (obs.type === 'uGrav') {
	if (gravity > 0){
	  gravity = gravity*-1; // change gravity
	}	
      } else if (obs.type === 'dGrav') {
	if (gravity < 0){
	  gravity = gravity*-1; // change gravity
	}
      } else if (obs.type === 'miniSize') {
	if (gravity < 0){
	  gravity = -2; // change gravity
	} else {
	  gravity = 2;
	}
      } else if (obs.type === 'normalSize') {
	if (gravity < 0){
	  gravity = -1; // change gravity
	} else {
	  gravity = 1;
	}
      } else if (obs.type === 'bigSize') {
	if (gravity < 0){
	  gravity = -0.5; // change gravity
	} else {
	  gravity = 0.5;
	}
      } else {
        // if inside cube, check if is also inside the triangle
        if (checkTriangleCollision(drawX, obs.y, obs.width, obs.type) && !noclip) {
          menu = true;
	  gravity = 1;
        }
      }
    }

    // Clean up off-screen items
    if (drawX + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}
function checkTriangleCollision(tx, ty, size, type) {
  // Find player corners relative to the triangle tile origin (0 to size)
  let px1 = playerx - tx;
  let px2 = (playerx + playerwidth) - tx;
  let py1 = playery - ty;
  let py2 = (playery + playerheight) - ty;

  // Clamp values inside bounds of the tile grid block
  let minX = Math.max(0, px1);
  let maxX = Math.min(size, px2);

  if (minX > maxX) return false;

  if (type === 'tr_bl') {
    // Slope line: y = x. Hazard zone is when player Y goes deep down (higher value)
    // Check top-right corner of player against the hypotenuse
    return py2 > minX; 
  }
  if (type === 'tr_br') {
    // Slope line: y = size - x. 
    return py2 > (size - maxX);
  }
  if (type === 'tr_tl') {
    // Slope line: y = size - x. Hazard zone is when player Y is near top (lower value)
    return py1 < (size - minX);
  }
  if (type === 'tr_tr') {
    // Slope line: y = x.
    return py1 < maxX;
  }
  return false;
}
async function loadLevelFromFile(filePath) {
  try {
    // Wait for the raw fetch response
    const response = await fetch(filePath);
    // Wait for the text conversion
    const textData = await response.text();
    
    // Process the text data into the 2D array
    const rows = textData.trim().split(/\r?\n/);
    const levelarray = rows.map(row => row.split(''));
    
    return levelarray; 
  } catch (error) {
    console.error("Error loading the map file:", error);
  }
}

/*----- Input -----*/
var spacekey = false;
var lastspacekey = false;

function handleKeyDown(event){
  lastspacekey = spacekey;
  lastmenu = menu;
  // controls
  if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'mouseDown') {
    spacekey = true;
    if(menu && lastmenu){
      menu = false;
      Reset();
    }
  }
  //levels
  if (event.key === '1') {
    selectedlevelnum = 1;
  }
  if (event.key === '2') {
    selectedlevelnum = 2;
  }
  if (event.key === '3') {
    selectedlevelnum = 3;
  }
  if (event.key === '4') {
    selectedlevelnum = 4;
  }
  if (event.key === '5') {
    selectedlevelnum = 5;
  }
  if (event.key === '6') {
    selectedlevelnum = 6;
  }
  if (event.key === '7') {
    selectedlevelnum = 7;
  }
  if (event.key === '8') {
    selectedlevelnum = 8;
  }

  // exit etc
  if (event.key === 'e') {
    if(!menu){
      menu = true;
    }
  }
  if (event.key === 'Enter') {
    if(menu){
      menu = false;
      Reset();
    }
  }
}
function handleKeyUp(event){
  // controls
  if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w') {
    spacekey = false;
  }
  if (event.key === 'n') {
    if(noclip){
      noclip = false;
    }
    else{
      noclip = true;
    }
  }
  if (event.key === 'm') {
    if(macro){
      macro = false;
    }
    else{
      macro = true;
    }
  }
}

function Logic(){
  levelposition += speed;

  // trail stuff
  // Save current position to the start of array
  trailpositions.unshift({ x: playerx, y: playery });
  // pop end of array
  if (trailpositions.length > MAX_TRAIL_LENGTH) {
    trailpositions.pop();
  }
  playerx = playerxoffset;

if (gamemode === "wave"){
  if (spacekey || (macro && levelposition % 2 == 0)) {
    playery -= (speed*gravity);
  }
  else{
    playery += (speed*gravity);
  }
}
if (gamemode === "ship"){
shipGravity = gravity;
    if (spacekey || (macro && levelposition % 2 == 0)) {
    shipGravity = -shipGravity;
  }
  shipSpeed = shipSpeed+(shipGravity/3); //rate of turn. (ie. (shipGravity) is fast turn, (shipGravity/10) is super slow turn.
  if (shipSpeed > (5*gravity)){ 
    shipSpeed = (5*gravity); //maximum downwards angle
  }
  if (shipSpeed < (-5*gravity)){
    shipSpeed = (-5*gravity); //maximum upwards angle
  }
  playery += shipSpeed;
}
 //collisions
  if(playerx < 0){
    playerx = 0;
    shipSpeed = 0;
  }
  if(playerx > screenh - playerheight){
    playerx = screenh - playerheight;
    shipSpeed = 0;
  }
  if(playery < 0){
    playery = 0;
    shipSpeed = 0;
  }
  if(playery > screenh - playerheight){
    playery = screenh - playerheight;
    shipSpeed = 0;
  }
}

function Draw(){
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // menu screen
  if(menu){
    ctx.fillStyle = 'black';
    ctx.font = '16px sans-serif';
    ctx.fillText('Trigonometry Run', 145, 16);
    ctx.fillText('Press enter to play', 145, 32);
    ctx.fillText('Press e to exit', 160, 48);

    ctx.fillText('Noclip', 170, 64);
    if(noclip){
      ctx.fillStyle = 'green';
      ctx.fillText('ON', 220, 64);
    }else{
      ctx.fillStyle = 'red';
      ctx.fillText('OFF', 220, 64);
    }
    ctx.fillStyle = 'black';
    ctx.fillText('Macro', 170, 80);
    if(macro){
      ctx.fillStyle = 'green';
      ctx.fillText('ON', 220, 80);
    }else{
      ctx.fillStyle = 'red';
      ctx.fillText('OFF', 220, 80);
    }
    ctx.fillStyle = 'black';

    ctx.fillText('Selected level:', 150, 96);
    ctx.fillText(selectedlevelnum, 260, 96);
  }
  // game screen
  else{
    // draw trail
    for (let i = 0; i < trailpositions.length; i++) {
      // move trail piece to the left
      trailpositions[i].x -= speed;

      // draw it
      if(trailpositions[i].y == 0 || trailpositions[i].y == screenh - playerheight){
        ctx.fillStyle = 'red';
        let smallbox = gridSize * 0.65;
        ctx.fillRect(trailpositions[i].x + (gridSize - smallbox) / 2, trailpositions[i].y + (gridSize - smallbox) / 2, smallbox, smallbox);

      }
      else{
        let centerX = trailpositions[i].x + gridSize / 2;
        let centerY = trailpositions[i].y + gridSize / 2;
        let radius = gridSize / 2;

        // draw the diamond shaped path
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius); // Top vertex
        ctx.lineTo(centerX + radius, centerY); // Right vertex
        ctx.lineTo(centerX, centerY + radius); // Bottom vertex
        ctx.lineTo(centerX - radius, centerY); // Left vertex
        ctx.closePath();

        ctx.fillStyle = 'red';
        ctx.fill();
      }
    }
    // draw player
    if(noclip){
      ctx.fillStyle = 'grey';
    }else{
      ctx.fillStyle = 'blue';
    }
    ctx.fillRect(playerx + playerwidth * 0.125, playery + playerheight * 0.125, playerwidth, playerheight);
    //draw player border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerx + playerwidth * 0.125, playery + playerheight * 0.125, playerwidth, playerheight);
    //obstacles
    handleAndDrawObstacles();
  }
}

async function Reset(){
  playery = screenh - playerheight;
  obstacles = [];
  trailpositions = [];
  levelposition = -10 * gridSize;
  let selectedlevel;
  if(selectedlevelnum == 1){
    selectedlevel = await loadLevelFromFile("level1.txt");
    speed = 5;
    gamemode = "wave";
    gravity = 1;
  }
  else if(selectedlevelnum == 2){
    selectedlevel = await loadLevelFromFile("level2.txt");
    speed = 5;
    gamemode = "wave";
    gravity = 1;
  }
  else if(selectedlevelnum == 3){
    selectedlevel = await loadLevelFromFile("level3.txt");
    speed = 5;
    gamemode = "wave";
    gravity = 1;
  }
  else if(selectedlevelnum == 4){
    selectedlevel = await loadLevelFromFile("level4.txt");
    speed = 5;
    gamemode = "wave";
    gravity = 2;
  }
  else if(selectedlevelnum == 5){
    selectedlevel = await loadLevelFromFile("level5.txt");
    speed = 6;
    gamemode = "wave";
    gravity = 1;
  }
  else if(selectedlevelnum == 6){
    selectedlevel = await loadLevelFromFile("level6.txt");
    speed = 12;
    gamemode = "wave";
    gravity = 1;
  }
  else if(selectedlevelnum == 7){
    selectedlevel = await loadLevelFromFile("level5.txt");
    speed = 5;
    gamemode = "ship";
    gravity = 1;
  }
  else if(selectedlevelnum == 8){
    selectedlevel = await loadLevelFromFile("level8.txt");
    speed = 5;
    gamemode = "wave";
    gravity = 1;
  }

// 1/2 speed = 3. 1 speed = 5. 2 speed = 7. 3 speed = 9. 4 speed = 12.

  // use array to create obstacles 
  for (let r = 0; r < selectedlevel.length; r++) {
    for (let c = 0; c < selectedlevel[r].length; c++) {
      if (selectedlevel[r][c] === '#') {
        spawnObstacle(c * gridSize, r * gridSize, 'cube');
      } else if (selectedlevel[r][c] === 'e') { 
        spawnObstacle(c * gridSize, r * gridSize, 'end'); // end trigger
      } else if (selectedlevel[r][c] === 'u') { 
        spawnObstacle(c * gridSize, r * gridSize, 'uGrav'); // end trigger
      } else if (selectedlevel[r][c] === 'd') { 
        spawnObstacle(c * gridSize, r * gridSize, 'dGrav'); // end trigger
      } else if (selectedlevel[r][c] === 'm') { 
        spawnObstacle(c * gridSize, r * gridSize, 'miniSize'); // end trigger
      } else if (selectedlevel[r][c] === 'n') { 
        spawnObstacle(c * gridSize, r * gridSize, 'normalSize'); // end trigger
      } else if (selectedlevel[r][c] === 'b') { 
        spawnObstacle(c * gridSize, r * gridSize, 'bigSize'); // end trigger
      } else if (selectedlevel[r][c] === 'L') { 
        spawnObstacle(c * gridSize, r * gridSize, 'tr_bl'); // Bottom-Left
      } else if (selectedlevel[r][c] === 'J') { 
        spawnObstacle(c * gridSize, r * gridSize, 'tr_br'); // Bottom-Right
      } else if (selectedlevel[r][c] === 'r') { 
        spawnObstacle(c * gridSize, r * gridSize, 'tr_tl'); // Top-Left
      } else if (selectedlevel[r][c] === '7') { 
        spawnObstacle(c * gridSize, r * gridSize, 'tr_tr'); // Top-Right
      }
    }
  }
}

function Update() {
  Logic();
  Draw();
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
loop = setInterval(Update, 16); // 33 = 30 fps, 100 = 10fps