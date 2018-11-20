/*************************
 * Globals for everyone.
 ************************/
const mvae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');

// Play with this to get back a larger or smaller blend of melodies
const numInterpolations = 1; //
let MELODY1 = presetMelodies['Melody 1'];
let MELODY2 = presetMelodies['Melody 2'];
let interpolatedNoteSequence;

go();

function go() {
  // Add the preset melodies to the selectors.
  initMelodySelectors();

  player.callback = {
    run: (note) => {},
    stop: () => {}
  };

  mvae.initialize().then(async () => {
    // Enable play button.
    const splashPlayButton = document.querySelector('.splash-play-button');
    splashPlayButton.innerHTML = 'PLAY';
    splashPlayButton.disabled = false;

    // Interpolate the currently selected melodies.
    interpolateMelodies();
  });

  const playPauseButton = document.querySelector('.play-pause-button');
  playPauseButton.addEventListener('click', togglePlayback);
}

async function interpolateMelodies() {
  const totalInterpolations = 2 + numInterpolations; // 2 to include the base.
  const ns = await mvae.interpolate([MELODY1, MELODY2], totalInterpolations);
  interpolatedNoteSequence = ns[1];
  player.loadSamples(ns[1]);
  console.log('🎧 new interpolation ready');
}

/*************************
 * Splash -> Play screens
 ************************/
// Called when the Play button is clicked.
let displayingSplash;
function onPlay() {
  const splash = document.querySelector('.splash');
  splash.style.opacity = 0.0;
  setTimeout(function() { //duration of fade
    splash.style.display = 'none';
    displayingSplash = false;
  }, 500);
}

function togglePlayback() {
  if (!interpolatedNoteSequence) {
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
    player.start(interpolatedNoteSequence).then(() => {
      playPauseButton.classList.remove('active');
    });
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

  melodySelectors.forEach(function(selector){
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
    //sequences.colorA = color(selectedColor);
  } else {
      MELODY2 = preset || mvae.sample(1)[0];
      selectedColor = preset ? preset.color : getGeneratedMelodyColor(1);
     // sequences.colorB = color(selectedColor);
  }
  selector.style.backgroundColor = 'rgb(' + selectedColor.join(',') + ')';

  if (shouldInterpolate){
    interpolateMelodies();
  }
}

/*************************
 * Colours
 ************************/
function getGeneratedMelodyColor(selectorIndex){
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
