//Tank colors
const violet = 'rgba(191, 127, 245)';
const violet_border = 'rgba(143, 95, 183)';

const blue = 'rgba(0, 178, 225)';
const blue_border = 'rgba(0, 133, 168)';

const red = 'rgba(241, 78, 84)';
const red_border = 'rgba(180, 58, 63)';

const green = 'rgba(0, 225, 110)';
const green_border = 'rgba(0, 168, 82)';

const torret_color = 'rgb(153,153,153)';
const torret_border_color = 'rgba(114, 114, 114)';

//Torrets - despues se va a ir
const torret_width = 40;
const torret_height = 50;

//Shape colors
const greensqr = 'rgba(255, 232, 105)'
const greensqr_border = 'rgba(203, 185, 83)'

//Hp color
const hp_bg = 'rgba(85, 85, 85)'
const hp_color = 'rgba(129, 215, 122)'

//lvl colors
const lvl_bg_color = 'rgba(61, 59, 62)'
const lvl_color = 'rgba(240, 217, 108)'

//upgrade color
const upg_color = 'rgba(55, 55, 55)'
const upg_color_list = {
    1: {color: 'rgba(232, 176, 138)', text: 'Health Regen'},
    2: {color: 'rgba(230, 102, 234)', text: 'Max Health'},
    3: {color: 'rgba(148, 102, 234)', text: 'Body Damage'},
    4: {color: 'rgba(102, 144, 234)', text: 'Bullet Speed'},
    5: {color: 'rgba(234, 211, 102)', text: 'Bullet Penetration'},
    6: {color: 'rgba(234, 102, 102)', text: 'Bullet Damage'},
    7: {color: 'rgba(146, 234, 102)', text: 'Reload'},
    8: {color: 'rgba(102, 234, 230)', text: 'Movement Speed'}
}

//Map borders
const leftLimit = 886;
const rightLimit = 7115;
const upperLimit = 891;
const bottomLimit = 7127;

//Lvl scores
const lvlScore = [0, 10, 20, 40, 70, 120, 200, 300, 500];

//Sockets packs
let initPack = { player: [], bullet: [] };
let removePack = { player: [], bullet: [] };

module.exports = {
    leftLimit: leftLimit,
    rightLimit: rightLimit,
    upperLimit: upperLimit,
    bottomLimit: bottomLimit,
    initPack: initPack,
    removePack: removePack
}


