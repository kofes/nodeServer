let marginBottom = 0;
let moveUpIntervalId;
let appearanceIntervalId;
let overlayIntevalId;
let opacity = {
    'input': 0,         //1.0
    'enter': 0,         //1.0
    'button': 0,        //1.0
    'layerBorder': -0.2 //0.8
};
let frameSpeed = 10;
let countSteps = 30;
let opacitySpeed = 0.02;
let appearanceSpeed = 0.01;
let validated = [true, true, true];

window.onload = () => {
    document.getElementById('enter').onsubmit = () => {
        let isValidateOk = validated[0]&&validated[1]&&validated[2];
        if (isValidateOk) {
            moveUpIntervalId = setInterval(moveUp, 5, document.getElementById('layer'));
            return validated[0]&&validated[1]&&validated[2];
        }
        return false;
    }
    signIn();
}
function moveUp (element, page) {
    if (opacity['input'] <= 0 ||
        marginBottom >= frameSpeed*countSteps) {
        //Because setInterval is async
        marginBottom = 0;
        for (var i = 0; i < validated.length; i++)
            validated[i] = true;
        document.getElementById('layer').style.marginBottom = marginBottom;
        //
        let client = new XMLHttpRequest();
        client.open('GET', page, false);
        client.send();
        document.getElementById('enter').innerHTML = client.responseText;
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

    document.getElementById('enter').style.backgroundColor = 'rgb(255, 255, 255)';
    document.getElementById('enter').style.opacity = opacity['enter'];

    document.getElementById('layer').style.borderColor = 'rgba(255, 255, 255, '+opacity['layerBorder']+')';
}
function signIn() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'sign_in.html');
}
function signUp() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'sign_up.html');
}
function sendEmail() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'send_email.html');
}
function resetPasswd() {
    moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), 'reset_passwd.html');
}
function validateEmail(elem) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    validated[0] = re.test(elem.value);
    elem.style.boxShadow = (!validated[0]) ? '0 0 5px red' : 'none';
}
function validatePasswd(elem) {
    let re = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])[a-zA-Z0-9_]{6,16}$/;
    validated[1] = re.test(elem.value);
    elem.style.boxShadow = (!validated[1]) ? '0 0 5px red' : 'none';
}
function validateNickname(elem) {
    let re = /^[^0-9]\w+$/;
    validated[2] = re.test(elem.value);
    elem.style.boxShadow = (!validated[2]) ? '0 0 5px red' : 'none';
}