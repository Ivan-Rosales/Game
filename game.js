let w = 600;
let h = 450;
let menu;
let nnNetwork, nnEntrenamiento;
let datosEntrenamiento = [];
let modoAuto = false, eCompleto = false;
let xd, yd;

let vel_max = 200;
let vel_min = 100;
let vel = 300;

let umbral = 0.2;

let cursors, balls, jugador, pausaL;

let game = new Phaser.Game(w, h, Phaser.CANVAS, 'phaser-example', {
    preload: preload, create: create, update: update, render: render
});

function preload() {
    game.load.image('fondo', './assets/game/fondo.jpg');
    game.load.image('dude', './assets/junks/dude_1.png');
    game.load.image('ball', './assets/sprites/purple_ball.png');
    game.load.image('menu', './assets/game/menu.png');
    game.load.spritesheet('mono', './assets/sprites/altair.png', 32, 48);
}

let image;

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    cursors = game.input.keyboard.createCursorKeys();

    fondo = game.add.tileSprite(0, 0, w, h, 'fondo');

    balls = [];
    for (let i = 0; i < 3; i++) {
        balls.push(game.add.sprite(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 'ball'));
    }

    jugador = game.add.sprite(parseInt((w / 2).toString()), parseInt((h / 2).toString()), 'mono');
    jugador.animations.add('corre', [8, 9, 10, 11]);
    jugador.animations.play('corre', 10, true);

    game.physics.enable([jugador, ...balls], Phaser.Physics.ARCADE);

    jugador.body.immovable = true;

    balls.forEach(ball => {
        const p_dir = [-1, 1]
        const dir = Math.floor(Math.random() * p_dir.length)
        ball.body.velocity.setTo(vel_min * p_dir[dir], vel_max * p_dir[dir]);
        ball.body.collideWorldBounds = true;
        ball.body.bounce.setTo(1);
    });

    jugador.body.collideWorldBounds = true;

    pausaL = game.add.text(w - 100, 20, 'Pausa', {font: '20px Arial', fill: '#fff'});
    pausaL.inputEnabled = true;
    pausaL.events.onInputUp.add(pausa, self);
    game.input.onDown.add(mPausa, self);


    nnNetwork = new synaptic.Architect.Perceptron(13, 8, 8, 8, 4);
    nnEntrenamiento = new synaptic.Trainer(nnNetwork);

}

function get_distance(ball) {
    return Math.sqrt(Math.pow(ball.position.x - jugador.position.x, 2) + Math.pow(ball.position.y - jugador.position.y, 2));
}

function get_data() {
    balls.sort(function (a, b) {
        return get_distance(a) - get_distance(b);
    });

    let hip_1 = get_distance(balls[0]);
    let hip_2 = get_distance(balls[1]);
    let hip_3 = get_distance(balls[2]);

    // let ca = balls[0].position.x - jugador.position.x;
    let co_1 = balls[0].position.y - jugador.position.y;
    let co_2 = balls[1].position.y - jugador.position.y;
    let co_3 = balls[2].position.y - jugador.position.y;

    let vel_x_1 = balls[0].body.velocity.x
    let vel_y_1 = balls[0].body.velocity.y

    let vel_x_2 = balls[1].body.velocity.x
    let vel_y_2 = balls[1].body.velocity.y

    let vel_x_3 = balls[2].body.velocity.x
    let vel_y_3 = balls[2].body.velocity.y

    return [
        (h - hip_1) / h, (Math.asin(co_1 / hip_1) + 1.6) / 3.2, vel_x_1 / vel_max, vel_y_1 / vel_max,
        (h - hip_2) / h, (Math.asin(co_2 / hip_2) + 1.6) / 3.2, vel_x_2 / vel_max, vel_y_2 / vel_max,
        (h - hip_3) / h, (Math.asin(co_3 / hip_3) + 1.6) / 3.2, vel_x_3 / vel_max, vel_y_3 / vel_max,
    ]
}

function update() {

    game.physics.arcade.collide(jugador, balls[0], collisionH);
    game.physics.arcade.collide(jugador, balls[1], collisionH);
    game.physics.arcade.collide(jugador, balls[2], collisionH);

    for (let i = 0; i < balls.length; i++) {
        for (let j = i; j < balls.length; j++) {
            game.physics.arcade.collide(balls[i], balls[j]);
        }
    }

    if (modoAuto) {
        let data = get_data();
        let res = datosDeEntrenamiento([...data, 1]);
        console.log("Right:", res[0], "Left:", res[1], "Down:", res[2], "Up:", res[3]);

        if (res[0] > umbral || res[1] > umbral) {
            let temp = res[0] - res[1];
            if (temp > 0)
                jugador.body.velocity.x = vel;
            else
                jugador.body.velocity.x = -vel;
        }

        if (res[2] > umbral || res[3] > umbral) {
            let temp = res[2] - res[3];
            if (temp > 0)
                jugador.body.velocity.y = vel;
            else
                jugador.body.velocity.y = -vel;
        }

        if (!(res[0] > umbral) && !(res[1] > umbral) && !(res[2] > umbral) && !(res[3] > umbral)) {
            jugador.body.velocity.setTo(0, 0);
            jugador.animations.stop('corre');
        } else jugador.animations.play('corre', 10, true);

    } else {
        if (jugador.position.x + 1 > 0 && jugador.position.y + 1 > 0) {
            jugador.animations.play('corre', 10, true);
            if (cursors.right.isDown) {
                jugador.body.velocity.x = vel;
            } else if (cursors.left.isDown) {
                jugador.body.velocity.x = -vel;
            } else if (cursors.down.isDown) {
                jugador.body.velocity.y = vel;
            } else if (cursors.up.isDown) {
                jugador.body.velocity.y = -vel;
            } else {
                jugador.body.velocity.setTo(0, 0);
                jugador.animations.stop('corre');
            }
        }

        let data = get_data();

        let mul = (cursors.right.isDown || cursors.left.isDown || cursors.down.isDown || cursors.up.isDown) ? 1 : 0;

        let value = {
            'input': [...data, mul],
            'output': [cursors.right.isDown ? 1 : 0, cursors.left.isDown ? 1 : 0, cursors.down.isDown ? 1 : 0, cursors.up.isDown ? 1 : 0,]
        }

        console.log(datosEntrenamiento.length);
        console.log([cursors.right.isDown ? 1 : 0, cursors.left.isDown ? 1 : 0, cursors.down.isDown ? 1 : 0, cursors.up.isDown ? 1 : 0,]);

        datosEntrenamiento.push(value);
    }

}

function datosDeEntrenamiento(param_entrada) {
    nnSalida = nnNetwork.activate(param_entrada);
    return nnSalida;
}

function render() {
}


function enRedNeural() {
    nnEntrenamiento.train(datosEntrenamiento, {rate: 0.001, iterations: 3000, error: 0.005, shuffle: true, log: 1});
}


function collisionH() {
    pausa();
}


function pausa() {
    game.paused = true;
    menu = game.add.sprite(w / 2, h / 2, 'menu');
    menu.anchor.setTo(0.5, 0.5);
}

function mPausa(event) {
    if (game.paused) {
        let menu_x1 = w / 2 - 270 / 2, menu_x2 = w / 2 + 270 / 2, menu_y1 = h / 2 - 180 / 2, menu_y2 = h / 2 + 180 / 2;

        let mouse_x = event.x, mouse_y = event.y;

        if (mouse_x > menu_x1 && mouse_x < menu_x2 && mouse_y > menu_y1 && mouse_y < menu_y2) {
            if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 && mouse_y <= menu_y1 + 90) {
                eCompleto = false;
                // datosEntrenamiento = [];
                modoAuto = false;
                resettable();
            } else if (mouse_x >= menu_x1 && mouse_x <= menu_x2 && mouse_y >= menu_y1 + 90 && mouse_y <= menu_y2) {
                if (!eCompleto) {
                    console.log("", "Entrenamiento " + datosEntrenamiento.length + " valores");
                    enRedNeural();
                    eCompleto = true;
                }
                modoAuto = true;
            }

            menu.destroy();
            resettable();
            game.paused = false;

        }
    }
}


function resettable() {
    balls.forEach(ball => {
        ball.position.x = Math.floor(Math.random() * w);
        ball.position.y = Math.floor(Math.random() * h);

        const p_dir = [-1, 1]
        const dir = Math.floor(Math.random() * p_dir.length)
        ball.body.velocity.setTo(vel_min * p_dir[dir], vel_max * p_dir[dir]);
    });

    jugador.position.x = parseInt((w / 2).toString());
    jugador.position.y = parseInt((h / 2).toString());
}
