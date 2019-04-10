const SHOOTING_SPEED = 15;
const SCORE_INCREASE = 10;
const SPEED = 40;
const STAR_NUMBER = 250;
const ENEMY_FREQ = 1500;
const ENEMY_SHOOTING_FREQ = 750;

// STARFIELD - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const starStream = Rx.Observable.range(1, STAR_NUMBER)
  .map(function () {
    return {
      x: parseInt(Math.random() * canvas.width),
      y: parseInt(Math.random() * canvas.height),
      size: Math.random() * 3 + 1
    };
  })
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
  });

// SPACESHIP - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const HERO_Y = canvas.height - 30;
const mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove');
const spaceship = mouseMove
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

// GAME FUNCTIONS  - - - - - - - - - - - - - - - - - - - - - - - - - -

function isVisible(obj) {
  return obj.x > -40 && obj.x < canvas.width + 40 &&
    obj.y > -40 && obj.y < canvas.height + 40;
}

function collision(target1, target2) {
  return (target1.x > target2.x - 20 && target1.x < target2.x + 20 &&
    target1.y > target2.y - 20 && target1.y < target2.y + 20);
}

function gameOver(ship, enemies) {
  return enemies.some(function (enemy) {
    if (collision(ship, enemy)) {
     return true;
    }

    return enemy.shots.some(function (shot) {
      return collision(ship, shot);
    });
  });
}

// SCORE - - - - - - - - - - - - - - - - - - - - - - - - - -

const scoreSubject = new Rx.Subject();
const score = scoreSubject.scan(function (acc, current) {
  return acc + current;
}, 0).startWith(0);

// ENEMIES - - - - - - - - - - - - - - - - - - - - - - - -

const enemies = Rx.Observable.interval(ENEMY_FREQ)
  .scan(function (enemyArray) {
    const enemy = {
      x: parseInt(Math.random() * canvas.width),
      y: -30,
      shots: []
    };

    Rx.Observable.interval(ENEMY_SHOOTING_FREQ)
      .subscribe(function () {
        if (!enemy.isDead) {
          enemy.shots.push({ x: enemy.x, y: enemy.y });
        }
        enemy.shots = enemy.shots.filter(isVisible);
      });

    enemyArray.push(enemy);

    return enemyArray.filter(isVisible)
      .filter(function (enemy) {
        return !(enemy.isDead && enemy.shots.length === 0);
      });
  }, []);

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function paintEnemies(enemies) {
  enemies.forEach(function (enemy) {
    enemy.y += 5;
    enemy.x += getRandomInt(-15, 15);

    if (!enemy.isDead) {
      drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
    }

    enemy.shots.forEach(function (shot) {
      shot.y += SHOOTING_SPEED;
      drawTriangle(shot.x, shot.y, 5, '#00ffff', 'down');
    });
  });
}

// HERO FIRING - - - - - - - - - - - - - - - - - - - - - - -

const playerFiring = Rx.Observable
  .merge(
    Rx.Observable.fromEvent(canvas, 'click'),
    Rx.Observable.fromEvent(canvas, 'keydown')
      .filter(function (evt) { return evt.keycode === 32; })
  )
  .sample(200)
  .startWith(0)
  .scan(function (acc, current) {
    return ++acc;
  }, -1);

const heroShots = Rx.Observable
  .combineLatest(
    playerFiring,
    spaceship,
    function (shotNumber, spaceship) {
      return {
        index: shotNumber,
        x: spaceship.x
      };
    }
  )
  .distinctUntilChanged(function (shot) { return shot.index; })
  .scan(function (shotArray, shot) {
    shotArray.push({x: shot.x, y: HERO_Y, index: shot.index });
    return shotArray;
  }, []);

// PAINTING FUNCTIONS  - - - - - - - - - - - - - - - - - - - - - - - -

function paintStars(stars) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  stars.forEach(function (star) {
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
}

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

function paintHeroShots(heroShots, enemies) {
  heroShots.forEach(function (shot, i) {
    if (shot.index > 0) {
      for (let l = 0; l < enemies.length; l++) {
        const enemy = enemies[l];
        if (!enemy.isDead && collision(shot, enemy)) {
          scoreSubject.onNext(SCORE_INCREASE);
          enemy.isDead = true;
          shot.x = shot.y = -100;
          break;
        }
      }

      shot.y -= SHOOTING_SPEED;
      drawTriangle(shot.x, shot.y, 5, '#ffff00', 'up');
    }
  });
}

function paintScore(score) {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Score: ' + score, 40, 43);
};

// GAME & RENDER SCENE - - - - - - - - - - - - - - - - - - -

function renderScene(actors) {
  paintStars(actors.stars);
  paintSpaceship(actors.spaceship.x, actors.spaceship.y);
  paintEnemies(actors.enemies);
  paintHeroShots(actors.shots, actors.enemies);
  paintScore(actors.score);
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