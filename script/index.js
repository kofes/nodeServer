let marginBottom = 0;
let moveUpIntervalId;
let appearanceIntervalId;
let overlayIntevalId;
let opacity = {
    'input': 0,         //1.0
    'content': 0,       //1.0
    'button': 0,        //1.0
    'layerBorder': -0.2 //0.8
};
let frameSpeed = 10;
let countSteps = 30;
let opacitySpeed = 0.02;
let appearanceSpeed = 0.01;

window.onload = () => {
    document.getElementById('content').onsubmit = () => {
        moveUpIntervalId = setInterval(moveUp, 5, document.getElementById('layer'));
        return true;
    }
    signIn();
}
function moveUp (element, page) {
    if (opacity['input'] <= 0 ||
        marginBottom >= frameSpeed*countSteps) {
        //Because setInterval is async
        marginBottom = 0;
        document.getElementById('layer').style.marginBottom = marginBottom;
        //
        let client = new XMLHttpRequest();
        client.open('GET', page, false);
        client.send();
        document.getElementById('content').innerHTML = client.responseText;
        //
        frameSpeed = (document.getElementById('layer').offsetTop + document.getElementById('layer').offsetHeight)/countSteps;
        opacitySpeed = 1/countSteps;
        document.getElementById('overlay').style.display = 'none';
        appearanceIntervalId = setInterval(appearance, 10);
        //
        clearInterval(moveUpIntervalId);
        return;
    }
    element.style.marginBottom = (marginBottom += frameSpeed) + 'px';
    for (var key in opacity)
        opacity[key] -= opacitySpeed;
    setOpacity();
}
function appearance () {
    if (opacity['input'] >= 1) {
        clearInterval(appearanceIntervalId);
        return;
    }
    for (var key in opacity)
        opacity[key] += appearanceSpeed;
    setOpacity();
}
function setOpacity() {
    let input = document.getElementsByTagName('input');
    
    for (var i = 0; i < input.length; ++i) {
        input[i].style.backgroundColor = 'rgb(0, 0, 0)';
        input[i].style.opacity = opacity['input'];
    }   

    let button = document.getElementsByTagName('button');
    for (var i = 0; i < button.length; ++i) {
        button[i].style.backgroundColor = 'rgb(0, 0, 0)';
        button[i].style.opacity = opacity['button'];
    }

    document.getElementById('content').style.backgroundColor = 'rgb(255, 255, 255)';
    document.getElementById('content').style.opacity = opacity['content'];

    document.getElementById('layer').style.borderColor = 'rgba(255, 255, 255, '+opacity['layerBorder']+')';
}
function signIn() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'sign_in.html');
}
function signUp() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'sign_up.html');
}
function resetPasswd() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'reset_pass.html');
}