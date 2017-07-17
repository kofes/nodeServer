let marginBottom = 0;
let moveUpIntervalId;
let appearanceIntervalId;
let overlayIntevalId;
let opacity = 0;
let frameSpeed = 10;
let countSteps = 30;
let opacitySpeed = 0.02;
let appearanceSpeed = 0.01;
const pages = {
    'sign up': 'sign_up.html',
    'sign in': 'sign_in.html',
    'reset passwd': 'reset_passwd.html',
    'send email': 'send_email.html'
};
let warningColor = 'yellow';
let errorColor = 'red';

window.onload = () => {
    loadAjax('sign in');
}
function submit() {
    verify();
    return false;
}
function loadAjax(cmd) {
    console.log(cmd);
    let page = pages[cmd];
    let input = document.getElementsByTagName('input');
    for (let i = 0; i < input.length; ++i) {
        input[i].style.boxShadow = 'none';
        input[i].style.borderColor = 'rgb(0,0,0)';
    }
    promiseMoveUp(page)
    .then(() => {
        marginBottom = 0;
        document.getElementById('main').style.marginBottom = marginBottom;
        let promise = promiseXhr(page)
        .then(data => {
            document.getElementById('main').innerHTML = data;
            document.getElementById('enter').onsubmit = submit;
            let input = document.getElementsByTagName('input');
            for (let i = 0; i < input.length; ++i) {
                input[i].onfocus = inputOnFocus;
                input[i].onblur = inputOnBlur;
            }
            frameSpeed = (document.getElementById('main').offsetTop + document.getElementById('main').offsetHeight)/countSteps;
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
        moveUpIntervalId = setInterval(moveUp, 10, document.getElementById('main'), page, resolve);
    });
}
function moveUp (element, page, resolve) {
    if (opacity <= 0 ||
        marginBottom >= frameSpeed*countSteps) {
        clearInterval(moveUpIntervalId);
        resolve();
        return;
    }
    element.style.marginBottom = (marginBottom += frameSpeed) + 'px';
    opacity -= opacitySpeed;
    document.getElementById('main').style.opacity = opacity;
}
function appearance () {
    if (opacity >= 1) {
        clearInterval(appearanceIntervalId);
        return;
    }
    opacity += appearanceSpeed;
    document.getElementById('main').style.opacity = opacity;
}
/* Verification of Submit & 
 * getting new data
*/
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
        xhr.setRequestHeader('content-type', 'application/json');
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status <= 300)
                resolve(xhr);
            else
                reject(xhr);
        }
        xhr.onerror = () => reject(xhr);
        console.log(JSON.stringify(jsonObj));
        xhr.send(JSON.stringify(jsonObj));
    })
    .then(xhr => {
        console.log(xhr.response);
        //Load page if sign in else load ajax
    })
    .catch(xhr => {
        if (xhr.status == 400) {
            switch (xhr.response) {
                case 'email not valid': markInput('email', warningColor); return;
                case 'email not exists': markInput('email', errorColor); return;
                case 'password not valid': markInput('passwd', warningColor); return;
                case 'wrong email/password':
                    markInput('email', errorColor);
                    markInput('passwd', errorColor);
                return;
                case 'nickname not valid': markInput('nickname', warningColor); return;
                default: break;
            }
        }
        document.getElementById('enter').innerHTML = xhr.response;
    });
}

function inputOnBlur() {
    this.style.boxShadow = 'none';
    this.style.borderColor = 'rgb(0,0,0)';
    if (this.value !== '')
        switch (this.name) {
            case 'email': if (!isValidEmail(this.value)) markInput('email', warningColor); break;
            case 'nickname': if (!isValidNickname(this.value)) markInput('nickname', warningColor); break;
            case 'passwd': if (!isValidPasswd(this.value)) markInput('passwd', warningColor); break;
            default: break;
        }
}
function inputOnFocus() {
    this.style.boxShadow = '0 0 5px rgb(81, 203, 238)';
    this.style.borderColor = 'rgb(81, 203, 238)';
}
function markInput(name, color) {
    let input = document.getElementsByName(name);
    for (let i = 0; i < input.length; ++i) {
        input[i].style.boxShadow = '0 0 10px '+color;
        input[i].style.borderColor = color;
    }
}
//Form validation
function isValidEmail(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function isValidPasswd(elem) {
    let re = /^.*(?=.{6,16})(?=.*[a-zA-Z])(?=.*\d).*$/;
    return re.test(elem);
}
function isValidNickname(elem) {
    let re = /^[^0-9]\w+$/;
    return re.test(elem);
}