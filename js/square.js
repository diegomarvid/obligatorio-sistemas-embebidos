const Entity = require('./Entity')

class Square extends Entity {


constructor(param) {

    super(param);

    this.bodyDamage = 2;
    this.id = Math.random();

    this.angle = 0;

    this.regen = 5 / 500;

    Square.list[this.id] = this;

}

move() {

    this.vx += this.ax
    this.vy += this.ay

    this.x += this.vx
    this.y += this.vy

}

show() {

    if(this.hp < this.hpMax) {
        this.hp += this.regen;
    }

    //Draw square

    let x = this.x - Tank.list[tankId].x + WIDTH / 2;
    let y = this.y - Tank.list[tankId].y + HEIGHT / 2;

    this.angle += 0.005;

    ctx.fillStyle = greensqr;
    ctx.lineWidth = 3;

    ctx.save();

    ctx.translate(x + this.r / 2, y + this.r / 2);

    ctx.rotate(this.angle)

    ctx.fillRect(- this.r / 2,  - this.r / 2, this.r, this.r);
    ctx.strokeStyle = greensqr_border;
    ctx.strokeRect(- this.r / 2,  - this.r / 2, this.r, this.r);

    ctx.restore();

    //Draw hp

    if(this.hp < this.hpMax) {

        //Hp

        let rectWidth = 50;
        let hpWidth = rectWidth * (this.hp / this.hpMax);

        //Fixed
        ctx.lineWidth = 3;
        ctx.strokeStyle = hp_bg;
        ctx.fillStyle = hp_bg;
        roundRect(ctx, x - rectWidth / 5 , y + this.r + 10 , rectWidth , 5, 3, true, true)

        //Variable
        
        ctx.fillStyle = hp_color;
        roundRect(ctx, x - rectWidth / 5 , y + this.r + 10 , hpWidth, 5, 3, true, false)
    }

     

    

}



}


Square.list = {};