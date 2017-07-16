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
const pages = {
    'sign up': 'sign_up.html',
    'sign in': 'sign_in.html',
    'reset passwd': 'reset_passwd.html',
    'send email': 'send_email.html'
};

window.onload = () => {
    document.getElementById('enter').onsubmit = () => {
        let isValidateOk = validated[0]&&validated[1]&&validated[2];
        if (isValidateOk) verify();
        return false;
    }
    loadAjax('sign in');
}
function loadAjax(cmd) {
    console.log(cmd);
    let page = (cmd in pages) ? pages[cmd] : '404.md';
    promiseMoveUp(page)
    .then(() => {
        marginBottom = 0;
        for (var i = 0; i < validated.length; i++)
            validated[i] = true;
        document.getElementById('layer').style.marginBottom = marginBottom;
        let promise = promiseXhr(page)
        .then(data => {
            document.getElementById('enter').innerHTML = data;
            frameSpeed = (document.getElementById('layer').offsetTop + document.getElementById('layer').offsetHeight)/countSteps;
            opacitySpeed = 1/countSteps;
            document.getElementById('overlay').style.display = 'none';
            appearanceIntervalId = setInterval(appearance, 10);
        })
        .catch(error => {
            console.log(error);
        });
    });
}
function promiseXhr(page) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', page);
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status <= 300)
                resolve(xhr.response);
            else
                reject(xhr.statusText);
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
    });
}
function promiseMoveUp(page) {
    return new Promise((resolve, reject) => {
        moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('layer'), page, resolve);
    });
}
function moveUp (element, page, resolve) {
    if (opacity['input'] <= 0 ||
        marginBottom >= frameSpeed*countSteps) {
        clearInterval(moveUpIntervalId);
        resolve();
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
function verify() {
    let jsonObj = {};
    let input = document.getElementsByTagName('input');
    for (let i = 0; i < input.length; i++)
        if (input[i].type != 'checkbox')
            jsonObj[input[i].name] = input[i].value;        
    jsonObj['type'] = document.getElementsByName('type')[0].value;
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('POST', 'submit')
        xhr.setRequestHeader('content-type', 'application/json; charset=utf-8');
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status <= 300)
                resolve(xhr);
            else
                reject(xhr.statusText);
        }
        xhr.onerror = () => reject(xhr.statusText);
        console.log(JSON.stringify(jsonObj));
        xhr.send(JSON.stringify(jsonObj));
    })
    .then(xhr => {
        console.log(xhr.response);
        // if (xhr.status == 400) {
            console.log(xhr.statusText);
        //Load page if sign in else load ajax
    })
    .catch(err => {
        console.log(err);
    });
}
//Form validation
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