const torret_width = 40;
const torret_height = 50;

class Entity {

    constructor(param) {

        this.x = param.x;
        this.y = param.y;
        this.vx = 0;
        this.vy = 0;
        this.r = param.r;
        this.mass = 1;
        this.hpMax = param.hpMax;
        this.hp = this.hpMax;

        if (param.vx) {
            this.vx = param.vx;
        }
        if (param.vy) {
            this.vy = param.vy;
        }
        if (param.mass) {
            this.mass = param.mass;
        }

    }

    getDistance(point) {
        return Math.sqrt(Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2));
    }

}


let d = require('./declarations');

Entity.getFrameUpdateData = function () {

    let pack = {

        initPack: {
            player: d.initPack.player,
            bullet: d.initPack.bullet
        },
        removePack: {
            player: d.removePack.player,
            bullet: d.removePack.bullet
        },
        updatePack: {
            player: Player.update(),
            bullet: Bullet.update()
        }
    };

    d.initPack.player = [];
    d.initPack.bullet = [];
    d.removePack.player = [];
    d.removePack.bullet = [];

    return pack;

}

//******************PLAYER******************//

class Player extends Entity {

    constructor(param) {

        super(param);

        //Identifier
        this.id = param.id;
        this.username = param.username;
        this.socket = param.socket;

        //Position variables
        this.ax = 0;
        this.ay = 0;
        this.positionChange = 0;
        this.mouseAngle = 0;

        this.score = 0;
        this.lvl = 1;
        this.class = 'Tank';
        

        //Movement UI
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingRight = false;
        this.pressingLeft = false;
        this.autoSpin = false;

        //Attack UI
        this.pressingAttack = false;
        this.attackCounter = 0;
        this.autoFire = false;

        this.upgradePoints = 0;

        //Habilities
        this.regen = 3 / 500;
        this.bodyDamage = 7;
        this.bulletSpeed = 6;
        this.bulletDamage = 20;
        this.reload = 0.6;
        this.movementSpeed = 0.4;
        
        
        this.fov = 0;

        Player.list[this.id] = this;

        d.initPack.player.push(this.getInitPack());
    }


    applyForce(fx, fy) {

        let forcex = fx / this.mass;
        let forcey = fy / this.mass;

        this.ax += forcex;
        this.ay += forcey;

    }

    collision() {


        let t;
        let s;
        let distance;

        for (let i in Player.list) {

            t = Player.list[i];

            distance = this.getDistance(t) - (t.r + this.r);

            if (t.id !== this.id && distance < 2) {


                t.hp -= ((this.bodyDamage) / (t.bodyDamage + this.bodyDamage)) * 1.5;
                this.hp -= ((t.bodyDamage) / (this.bodyDamage + t.bodyDamage)) * 1.5;

                if (t.hp <= 0) {
                    this.score += 10;
                    this.socket.emit('kill', {id: t.id, username: t.username});
                    t.respawn();
                    
                }

                if (this.hp <= 0) {
                    t.score += 10;
                    t.socket.emit('kill', {id: this.id, username: this.username});
                    this.respawn();

                }
                
            }
        }

        // for (let i in Square.list) {
        //     s = Square.list[i];
        //     distance = this.getDistance(s) - (s.r + this.r);



        //     if (distance < 1) {


        //         if (s.hp <= 0) return;

        //         s.isHit = true;
        //         s.hpTimerCounter = 0;

        //         this.isHit = true;
        //         this.hpTimerCounter = 0;

        //         s.hp -= ((this.bodyDamage) / (s.bodyDamage + this.bodyDamage)) * 1.5;
        //         this.hp -= ((s.bodyDamage) / (this.bodyDamage + s.bodyDamage)) * 1.5;

        //     }

        //     if (this.hp <= 0) {
        //         this.hp = 0;
        //     }
        //     if (s.hp <= 0) {
        //         s.hp = 0;
        //     }
        // }
    }

    update() {

        if (this.positionChange > 0.04) {
            this.drag();

        } else {
            this.vx = 0;
            this.vy = 0;
        }

        this.collision();
        this.attack();
        this.move();

        if (this.hp < this.hpMax) {
            this.hp += this.regen
        }

        this.attackCounter += this.reload;


    }

    attack() {


        if (this.pressingAttack || this.autoFire) {
            if (this.attackCounter > 25) {
                this.shootBullet(this.mouseAngle);
                this.attackCounter = 0;
            }
        }

    }

    move() {

        if (this.pressingRight) {
            this.applyForce(this.movementSpeed, 0);
        } else if (this.pressingLeft) {
            this.applyForce(-this.movementSpeed, 0);
        }
        if (this.pressingUp) {
            this.applyForce(0, -this.movementSpeed);
        } else if (this.pressingDown) {
            this.applyForce(0, this.movementSpeed);
        }

        if (this.autoSpin) {
            this.mouseAngle += 0.05;
        }


        let lastx = this.x;
        let lasty = this.y;

        this.vx += this.ax
        this.vy += this.ay

        this.x += this.vx
        this.y += this.vy

        this.positionChange = Math.sqrt(Math.pow(lastx - this.x, 2) + Math.pow(lasty - this.y, 2));

        if (this.x < d.leftLimit) {
            this.x = d.leftLimit;
        }
        if (this.x > d.rightLimit) {
            this.x = d.rightLimit;
        }
        if (this.y < d.upperLimit) {
            this.y = d.upperLimit;
        }
        if (this.y > d.bottomLimit) {
            this.y = d.bottomLimit;
        }

        this.ax = 0;
        this.ay = 0;

    }


    drag() {

        let speed = Math.sqrt(Math.pow(this.vx, 2) + Math.pow(this.vy, 2));

        if (speed === 0) return;

        let dragMagnitude = 0.06 * Math.pow(speed, 2);

        let dragForcex = -this.vx;
        let dragForcey = -this.vy;

        //Normalizar
        dragForcex = dragForcex / speed;
        dragForcey = dragForcey / speed;



        //Multiplicar por modulo
        let angle = Math.atan2(dragForcey, dragForcex);



        dragForcex = dragMagnitude * Math.cos(angle);
        dragForcey = dragMagnitude * Math.sin(angle);



        this.applyForce(dragForcex, dragForcey);

    }

    shootBullet(angle) {
        new Bullet({
            parent: this.id,
            angle: angle,
            x: this.x + torret_height * Math.cos(angle),
            y: this.y + torret_height * Math.sin(angle),
            r: torret_width / 2,
            speed: this.bulletSpeed,
            damage: this.bulletDamage,
            socket: this.socket
        })

        this.recoil(angle, 8);

    }

    recoil(angle, mag) {

        //RECOIL
        let fx = -mag * Math.cos(angle);
        let fy = -mag * Math.sin(angle);

        this.applyForce(fx, fy)
    }

    respawn() {
        this.hp = this.hpMax;
        let max = 1500;
        let min = 1000;
        let x = Math.random() * (max - min) + min;
        let y = Math.random() * (max - min) + min;
        this.x = x;
        this.y = y;
    }

    getInitPack() {
        return {
            id: this.id,
            username: this.username,
            x: this.x,
            y: this.y,
            score: this.score,
            lvl: this.lvl,
            r: this.r,
            hpMax: this.hpMax,
            fov: this.fov
        }
    }

    getUpdatePack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            hp: this.hp,
            score: this.score,
            mouseAngle: this.mouseAngle
        }
    }


}

//PLAYER CLASS

Player.list = {};

Player.update = function () {

    let player;
    let pack = [];

    for (let i in Player.list) {
        player = Player.list[i];

        player.update();

        pack.push(player.getUpdatePack());

    }

    return pack;

}

Player.getAllInitPack = function () {
    let players = [];
    for (let i in Player.list) {
        players.push(Player.list[i].getInitPack());
    }
    return players;
}

Player.onConnect = function (socket, username) {

    let max = 1500;
    let min = 1000;
    let x = Math.random() * (max - min) + min;
    let y = Math.random() * (max - min) + min;

    //Create player
    let player = new Player({
        id: socket.id,
        username: username,
        socket: socket,
        x: x,
        y: y,
        hpMax: 20,
        r: 25
    });

    socket.emit('init', {
        selfId: socket.id,
        player: Player.getAllInitPack(),
        bullet: Bullet.getAllInitPack()
    })

    socket.on('keyPress', function (data) {



        if (data.inputId == 'right') {
            player.pressingRight = data.state;
        } else if (data.inputId == 'left') {
            player.pressingLeft = data.state;
        } else if (data.inputId == 'up') {
            player.pressingUp = data.state;
        } else if (data.inputId == 'down') {
            player.pressingDown = data.state;
        } else if (data.inputId == 'attack') {
            player.pressingAttack = data.state
        } else if (data.inputId == 'autoSpin') {
            player.autoSpin = data.state;
        } else if (data.inputId == 'autoFire') {
            player.autoFire = data.state;
        }
        else if (data.inputId == 'mouseAngle') {
            if (!player.autoSpin) {
                player.mouseAngle = data.state
            }
        }

    });



}

Player.onDisconnect = function (socket) {
    delete Player.list[socket.id];
    d.removePack.player.push(socket.id);
}

//******************BULLET******************//

class Bullet extends Entity {

    constructor(param) {

        super(param);

        this.speed = param.speed;

        this.vx = Math.cos(param.angle) * this.speed;
        this.vy = Math.sin(param.angle) * this.speed;

        this.parent = param.parent;

        this.timer = 0;
        this.toRemove = 0;

        this.id = Math.random();
        this.socket = param.socket;

        this.damage = param.damage;
        this.penetration = 5;

        Bullet.list[this.id] = this;

        d.initPack.bullet.push(this.getInitPack());

    }

    update() {


        if (this.timer++ > 100) {
            this.toRemove = true;
        }

        let t;
        let b;
        let distance;

        for (let i in Player.list) {

            t = Player.list[i];
            distance = t.getDistance(this) - t.r - this.r;

            if (this.parent !== t.id && distance < 1) {
                t.hp -= this.damage;
    

                if (t.hp <= 0) {

                    let shooter = Player.list[this.parent];

                    this.socket.emit('kill', {id: t.id, username: t.username});

                    t.respawn();

                    if (shooter) {
                        shooter.score += 10;
                    }

                } 

                this.toRemove = true;

            }


        }

        for(let i in Bullet.list) {
            b = Bullet.list[i];
            distance = b.getDistance(this) - b.r - this.r;

            if(distance < 1 && b.id !== this.id) {
                if(this.penetration > b.penetration) {
                    b.toRemove = true;
                } else if(b.penetration > this.penetration) {
                    this.toRemove = true;
                } else{
                    b.toRemove = true;
                    this.toRemove = true;
                }
            }
        }

        // let s;

        // for(let i in Square.list) {
        //     s = Square.list[i];

        //     distance = s.getDistance(this) - s.r - this.r;

        //     if(distance < 1) {
        //         s.hp -= this.damage;

        //         if(this.penetration < 2) {
        //             this.toRemove = true;
        //         }
        //         s.isHit = true;
        //         s.hpTimerCounter = 0;
        //     }

        //     if(s.hp <= 0) {
        //         s.hp = s.hpMax;
        //         Tank.list[this.parent].score++;
        //     }

        // }


        this.x += this.vx
        this.y += this.vy


    }

    getInitPack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            r: this.r,
            parent: this.parent
        }
    }

    getUpdatePack() {
        return {
            id: this.id,
            x: this.x,
            y: this.y
        }
    }

}

Bullet.list = {}

Bullet.getAllInitPack = function () {
    let bullets = [];
    for (let i in Bullet.list) {
        bullets.push(Bullet.list[i].getInitPack());
    }
    return bullets;
}

Bullet.update = function () {

    let bullet;
    let pack = [];


    for (let i in Bullet.list) {
        bullet = Bullet.list[i];

        if (bullet.toRemove) {
            delete Bullet.list[i];
            d.removePack.bullet.push(bullet.id);
        } else {
            bullet.update();

            pack.push(bullet.getUpdatePack());
        }
    }

    return pack;
}

module.exports = {
    Entity: Entity,
    Player: Player,
    Bullet: Bullet
};