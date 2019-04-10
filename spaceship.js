const SPEED = 40;
const STAR_NUMBER = 250;

// --------------------------------------

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const StarStream$ = Rx.Observable
.range(1, STAR_NUMBER)
.map(() => ({
    x: parseInt(Math.random() * canvas.width, 10),
    y: parseInt(Math.random() * canvas.height, 10),
    size: Math.random() * 3 + 1
}))
.toArray()
.flatMap(function (starArray) {
    return Rx.Observable.interval(SPEED).map(function () {
      starArray.forEach(function (star) {
        if (star.y >= canvas.height) {
          star.y = 0;
        }
        star.y += 3;
      });
      return starArray;
    });
  })
  .subscribe(paintStars);

function paintStars(stars) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    stars.forEach(function (star) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

// SPACESHIP - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

var HERO_Y = canvas.height - 30;
var mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove');
var spaceship = mouseMove
  .map(function (event) {
    return {
      x: event.clientX,
      y: HERO_Y
    };
  })
  .startWith({
    x: canvas.width / 2,
    y: HERO_Y
  });

function drawTriangle(x, y, width, color, direction) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - width, y);
    ctx.lineTo(x, direction === 'up' ? y - width : y + width);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x - width, y);
    ctx.fill();
}

function paintSpaceship(x, y) {
    drawTriangle(x, y, 20, '#ff0000', 'up');
}

function renderScene(actors) {
    paintStars(actors.stars);
    paintSpaceship(actors.spaceship.x, actors.spaceship.y);
    // paintEnemies(actors.enemies);
    // paintHeroShots(actors.shots, actors.enemies);
    // paintScore(actors.score);
  }

const game = Rx.Observable
  .combineLatest(starStream, spaceship, enemies, heroShots, score,
    function (stars, spaceship, enemies, heroShots, score) {
      return { stars: stars, spaceship: spaceship, enemies: enemies, shots: heroShots, score: score };
    })
  .sample(SPEED)
  .takeWhile(function (actors) {
    return !gameOver(actors.spaceship, actors.enemies);
  })
  .subscribe(renderScene);