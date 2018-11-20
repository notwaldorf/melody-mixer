/*************************
 * Globals for everyone.
 ************************/
const mvae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
let displayingSplash = true;
// Interpolation.

let numInterpolations = 2; // including the start/end sequences.
let MELODY1 = presetMelodies['Melody 1'];
let MELODY2 = presetMelodies['Melody 2'];

let currentlyPlayingSequenceIndex = 0;
let interpolatedNoteSequences;
const sequences = {
  tileSize: 100,
  width: 100 * 2,
  targetWidth: 100 * 2,
  colorA: null,
  colorB: null
};

// P5 things.
const p5Canvas = new p5(sketch);

go();

function go() {
  // Add the preset melodies to the selectors.
  initMelodySelectors();

  player.callbackObject = {
    run: (note) => {p5Canvas.update()},
    stop: () => {
      currentlyPlayingSequenceIndex++;
      if (currentlyPlayingSequenceIndex === interpolatedNoteSequences.length) {
        currentlyPlayingSequenceIndex = 0;
        playPauseButton.classList.remove('active');
      } else {
        player.start(interpolatedNoteSequences[currentlyPlayingSequenceIndex]);
      }
    }
  };

  mvae.initialize().then(async () => {
    // Enable play button.
    const splashPlayButton = document.querySelector('.splash-play-button');
    splashPlayButton.innerHTML = 'PLAY';
    splashPlayButton.disabled = false;

    // Interpolate the currently selected melodies.
    interpolateMelodies().then(() => {console.log('update!'); p5Canvas.update()});
  });
  playPauseButton.addEventListener('click', togglePlayback);
}

async function interpolateMelodies() {
  mvae.interpolate([MELODY1, MELODY2], numInterpolations).then((samples) => {
    interpolatedNoteSequences = samples;
    console.log('🎧 new interpolation ready');
  });
}

/*************************
 * General UI
 ************************/
// Called when the Loading/Play button is clicked.
function onPlay() {
  const splash = document.querySelector('.splash');
  splash.style.opacity = 0.0;
  setTimeout(function() { //duration of fade
    splash.style.display = 'none';
    displayingSplash = false;
  }, 500);
}

function togglePlayback() {
  if (!interpolatedNoteSequences) {
    console.error('🙀 why is there no sequence here?');
    return;
  }

  if (mm.Player.tone.Transport.state === 'paused') {
    playPauseButton.classList.add('active');
    mm.Player.tone.Transport.start();
  } else if (player.isPlaying()) {
    mm.Player.tone.Transport.pause();
    playPauseButton.classList.remove('active');
  } else {
    player.loadSamples(interpolatedNoteSequences[currentlyPlayingSequenceIndex]);
    player.start(interpolatedNoteSequences[currentlyPlayingSequenceIndex]);
    playPauseButton.classList.add('active');
  }
}

/*************************
 * Melody selectors
 ************************/
function initMelodySelectors() {
  const melodySelectors = document.querySelectorAll('.drop-down');
  const options = Object.keys(presetMelodies)
      .concat(['Random sample'])
      .map(function(presetName) {
          return '<option>' + presetName + '</option>';
      }).join('');

  melodySelectors.forEach(function(selector, index) {
    selector.innerHTML = options;
    selector.addEventListener('input', (event) => updateSelector(event.target, true));
  });

  // Default selection: Melody 1 and Melody 2.
  melodySelectors[0].selectedIndex = 4;
  melodySelectors[1].selectedIndex = 5;

  melodySelectors.forEach(function(selector) {
    updateSelector(selector, false);
  });
}

function updateSelector(selector, shouldInterpolate) {
  const melodySelectors = document.querySelectorAll('.drop-down');
  const preset = presetMelodies[selector.value];
  let selectedColor;

  if (selector === melodySelectors[0]) {
    MELODY1 = preset || mvae.sample(1)[0];
    selectedColor = preset ? preset.color : getGeneratedMelodyColor(0);
    sequences.colorA = p5Canvas.color(selectedColor);
  } else {
      MELODY2 = preset || mvae.sample(1)[0];
      selectedColor = preset ? preset.color : getGeneratedMelodyColor(1);
      sequences.colorB = p5Canvas.color(selectedColor);
  }
  selector.style.backgroundColor = 'rgb(' + selectedColor.join(',') + ')';

  if (shouldInterpolate) {
    interpolateMelodies();
  }
}
/*************************
 * P5.js drawing bits
 ************************/
function sketch(p) {
  const SCRUB_BAR_HEIGHT = 20;
  const SCRUB_BAR_GAP = 20;
  let mouseDownPosition = null;
  const MAX_TILE_SIZE = 100;
  const NUM_STEPS = 32; // DO NOT CHANGE.
  const NUM_NOTES = 88;
  const MIDI_START_NOTE = 21;

  p.setup = function() {
    p.windowResized();
    p.noStroke();
    console.log('setup');
  };

  p.windowResized = function () {
    console.log('resized');
    const numTiles = sequences.targetWidth / sequences.tileSize;
    const nextSize = Math.min(MAX_TILE_SIZE,
        p.windowWidth / Math.max(8, Math.floor(numTiles)));
    sequences.targetWidth = numTiles * nextSize;
    sequences.tileSize = nextSize;

    const totalHeight = sequences.tileSize + SCRUB_BAR_GAP + SCRUB_BAR_HEIGHT;
    p.createCanvas(p.windowWidth, totalHeight);
  }

  p.mousePressed = function() {
    if (displayingSplash){
      return;
    }
    mouseDownPosition = new p5.Vector(p.mouseX, p.mouseY);
  }

  p.mouseReleased = function() {
    sequences.width = calcCurrentSequenceWidth();
    const numTiles = Math.round(sequences.width / sequences.tileSize);
    sequences.targetWidth = numTiles * sequences.tileSize;
    mouseDownPosition = null;
    numInterpolations = numTiles;

    interpolateMelodies();
  }

  p.update = function() {
    p.translate(0, p.height/2 - sequences.tileSize/2 - SCRUB_BAR_HEIGHT);

    // Drawing Tiles + notes
    p.noStroke();
    p.background(50);
    p.fill(53, 53, 53);
    p.rect(0, 0, p.width, SCRUB_BAR_HEIGHT);
    p.fill(249, 10);
    p.rect(0, SCRUB_BAR_GAP + SCRUB_BAR_HEIGHT, p.width, sequences.tileSize);

    // Move our origin (0,0) to the main tile area to simplify coordinates
    p.push();
    p.translate(0, SCRUB_BAR_GAP + SCRUB_BAR_HEIGHT);
    p.stroke(255);
    p.strokeWeight(2);

    tweenSequences();
    drawSequences();

    p.pop();

    // Origin is now back to top-left corner
    // if (mousePressedInScrubBar()) {
    //     var seekTime = 0.0;
    //     if (mouseX > tileLeft(0) && mouseX < tileRight(numInterpolations-1)) {
    //         seekTime = (mouseX - tileLeft(0)) / calcCurrentSequenceWidth() * totalPlayTime;
    //     } else if (mouseX > tileRight(numInterpolations - 1)) {
    //         seekTime = totalPlayTime - 0.00001 ; //make sure it sticks to the end
    //     }
    //     Tone.Transport.seconds = seekTime;
    // }

    // Playback logic
    const totalPlayTime = (mm.Player.tone.Transport.bpm.value * NUM_STEPS * numInterpolations) / 1000;
    const percent = mm.Player.tone.Transport.seconds / totalPlayTime % 1;
    drawPlayhead(new p5.Vector(tileLeft(0) + percent * calcCurrentSequenceWidth() , SCRUB_BAR_HEIGHT), SCRUB_BAR_GAP);
  }

  // Tween the sequence width towards its destination size
  function tweenSequences() {
    if (sequences.targetWidth !== sequences.width) {
      sequences.width += (sequences.targetWidth - sequences.width) * 0.1;

      if (Math.abs(sequences.width - sequences.targetWidth) < 0.05) {
        sequences.width = sequences.targetWidth;
      }
    }
  }

  function drawSequences() {
    const left = tileLeft(0);
    const right = tileRight(0);

    // How many tiles completely fit in this size
    const numTiles = calcCurrentSequenceWidth() / sequences.tileSize;
    const completedTiles = Math.floor(numTiles);
    const partSize = (numTiles - completedTiles) * sequences.tileSize;

    p.noStroke();
    for (let i = 0; i < completedTiles; i++) {
      const ceilTiles = partSize > 0 ? completedTiles : completedTiles - 1;
      let color;
      let x = left + sequences.tileSize * i;
      if (i < completedTiles - 1) {
        color = p.lerpColor(sequences.colorA, sequences.colorB, i / ceilTiles);
        p.fill(color);
        p.rect(x, 0, sequences.tileSize, sequences.tileSize);
      } else {
        if (partSize > 0) {
          color = p.lerpColor(sequences.colorA, sequences.colorB, i / ceilTiles);
          p.fill(color);
          p.rect(x, sequences.tileSize / 2 - partSize/2, partSize, partSize);
        }
        x += partSize;
        const t = partSize > 0 ? i + 1 : i;
        color = p.lerpColor(sequences.colorA, sequences.colorB, t / ceilTiles);
        p.fill(color);
        p.rect(x, 0, sequences.tileSize, sequences.tileSize);
      }
    }

    if (interpolatedNoteSequences) {
      if (mousePressedInSequenceTiles() || sequences.width !== sequences.targetWidth) {
        drawNotes(interpolatedNoteSequences[0].notes, tileLeft(0), sequences.tileSize);
        drawNotes(interpolatedNoteSequences[interpolatedNoteSequences.length-1].notes, tileLeft(completedTiles-1) + partSize, sequences.tileSize);
      } else {
        for (let i = 0; i < interpolatedNoteSequences.length; i++) {
          if (interpolatedNoteSequences.length > i) {
            drawNotes(interpolatedNoteSequences[i].notes, tileLeft(i), sequences.tileSize);
          }
        }
      }
    }
  }

  function drawNotes(notes, x, size) {
    p.push();
    p.translate(x, 0);
    p.fill(255);
    const cellWidth = size / NUM_STEPS;
    const cellHeight = size / NUM_NOTES;
    notes.forEach(function(note) {
      const emptyNoteSpacer = 1;
      p.rect(
          emptyNoteSpacer + cellWidth * note.quantizedStartStep,
          size - cellHeight * (note.pitch - MIDI_START_NOTE),
          cellWidth * (note.quantizedEndStep - note.quantizedStartStep) - emptyNoteSpacer, cellHeight);
    });
    p.pop();
  }

  // Render the triangle and line of where we are currently playing.
  function drawPlayhead(pos, triangleHeight) {
    const width = 20;
    const hWidth = width / 2;

    p.fill(255);
    p.triangle(pos.x - hWidth, pos.y,pos.x, pos.y + triangleHeight, pos.x + hWidth, pos.y);
    p.stroke(255);
    p.strokeWeight(2);
    p.line(pos.x, pos.y + 2, pos.x, sequences.tileSize + pos.y + triangleHeight);
  }

  // The left-side of the sequences rect
  function tileLeft(index) {
    return p.width / 2 - (calcCurrentSequenceWidth()/2) + (sequences.tileSize * index);
  }

  // The right-side of the sequences rect
  function tileRight(index) {
    return tileLeft(index) + sequences.tileSize;
  }

  function mousePressedInSequenceTiles() {
    return mouseDownPosition &&
        mouseDownPosition.y < p.height / 2 + SCRUB_BAR_HEIGHT + sequences.tileSize /2 &&
        mouseDownPosition.y > p.height / 2 - sequences.tileSize /2 + SCRUB_BAR_HEIGHT;
  }

  function mousePressedInScrubBar() {
    return mouseDownPosition &&
        mouseDownPosition.y < p.height / 2 + SCRUB_BAR_HEIGHT  - sequences.tileSize /2 &&
        mouseDownPosition.y > p.height / 2 - sequences.tileSize /2;
  }

  // Calculate how long the sequences width should currently be.
  function calcCurrentSequenceWidth() {
    if (!mousePressedInSequenceTiles()) {
      return sequences.width;
    }

    const isMovingTowardsCenter = Math.abs(p.mouseX - p.width/2) < Math.abs(mouseDownPosition.x - p.width/2);
    // -1 if on left on center, 1 if on right
    const a = p.mouseX < p.width/2 ? -1 : 1;
    const b = mouseDownPosition.x < p.width / 2 ? -1 : 1;
    const didCrossCenter = a * b < 0;
    let currWidth;
    if (didCrossCenter) {
      currWidth = Math.abs(p.mouseX - p.width/2) * 2;
    } else if (isMovingTowardsCenter) {
      currWidth = sequences.width - Math.abs(p.mouseX - mouseDownPosition.x) * 2;
    } else {
      currWidth = sequences.width + Math.abs(p.mouseX - mouseDownPosition.x) * 2;
    }
    return Math.min(Math.max(currWidth, sequences.tileSize * 2), p.width - (p.width % sequences.tileSize));
  }
};




/*************************
 * Colours
 ************************/
function getGeneratedMelodyColor(selectorIndex) {
  const colorOptions = ([
      [
        [51, 137, 0],
        [46, 196, 91],
        [41, 255, 181]
      ],
      [
        [48, 17, 234],
        [24, 78, 211],
        [8, 139, 188]
      ]
  ])[selectorIndex];
  return colorOptions[Math.floor(Math.random(0, colorOptions.length))];
}

function randomColor() {
  var r = random(0, 360);
  colorMode(HSB);
  var c = color(r, 80, 100);
  colorMode(RGB);
  return c;
}

function randomComplimentaryColors() {
  var r = random(0, 360);

  colorMode(HSB);
  var c = color(r, 80, 100);
  var c2 = color(abs(180-r), 80, 100);
  colorMode(RGB);
  return [c, c2];
}

