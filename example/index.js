const AVS = require('../');
const player = AVS.Player;

const avs = new AVS({
  debug: true,
  clientId: 'amzn1.application-oa2-client.c8e7630f9a9148abb5012f72226ae580',
  deviceId: 'capeannAlexa',
  deviceSerialNumber: 123,
  redirectUri: `https://${window.location.host}/authresponse`
});
window.avs = avs;

avs.on(AVS.EventTypes.TOKEN_SET, () => {
  loginBtn.disabled = true;
  logoutBtn.disabled = false;
  startRecording.disabled = false;
  stopRecording.disabled = true;
});

avs.on(AVS.EventTypes.RECORD_START, () => {
  startRecording.disabled = true;
  stopRecording.disabled = false;
});

avs.on(AVS.EventTypes.RECORD_STOP, () => {
  startRecording.disabled = false;
  stopRecording.disabled = true;
});

avs.on(AVS.EventTypes.LOGOUT, () => {
  loginBtn.disabled = false;
  logoutBtn.disabled = true;
  startRecording.disabled = true;
  stopRecording.disabled = true;
});

avs.on(AVS.EventTypes.TOKEN_INVALID, () => {
  avs.logout()
  .then(login)
});

avs.on(AVS.EventTypes.LOG, log);
avs.on(AVS.EventTypes.ERROR, logError);

avs.player.on(AVS.Player.EventTypes.LOG, log);
avs.player.on(AVS.Player.EventTypes.ERROR, logError);

avs.player.on(AVS.Player.EventTypes.PLAY, () => {
  playAudio.disabled = true;
  replayAudio.disabled = true;
  pauseAudio.disabled = false;
  stopAudio.disabled = false;
});

avs.player.on(AVS.Player.EventTypes.ENDED, () => {
  playAudio.disabled = true;
  replayAudio.disabled = false;
  pauseAudio.disabled = true;
  stopAudio.disabled = true;
});

avs.player.on(AVS.Player.EventTypes.STOP, () => {
  playAudio.disabled = true;
  replayAudio.disabled = false;
  pauseAudio.disabled = false;
  stopAudio.disabled = false;
});

avs.player.on(AVS.Player.EventTypes.PAUSE, () => {
  playAudio.disabled = false;
  replayAudio.disabled = false;
  pauseAudio.disabled = true;
  stopAudio.disabled = true;
});

avs.player.on(AVS.Player.EventTypes.REPLAY, () => {
  playAudio.disabled = true;
  replayAudio.disabled = true;
  pauseAudio.disabled = false;
  stopAudio.disabled = false;
});

var Alexa = require('alexa-sdk');
console.log(Alexa);
exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
    console.log(alexa);
};

function log(message) {
  logOutput.innerHTML = `<li>LOG: ${message}</li>` + logOutput.innerHTML;
}

function logError(error) {
  logOutput.innerHTML = `<li>ERROR: ${error}</li>` + logOutput.innerHTML;
}

function logAudioBlob(blob, message) {
  return new Promise((resolve, reject) => {
    const a = document.createElement('a');
    const aDownload = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    const ext = blob.type.indexOf('mpeg') > -1 ? 'mp3' : 'wav';
    const filename = `${Date.now()}.${ext}`;
    a.href = url;
    a.target = '_blank';
    aDownload.href = url;
    a.textContent = filename;
    aDownload.download = filename;
    aDownload.textContent = `download`;

    audioLogOutput.innerHTML = `<li>${message}: ${a.outerHTML} ${aDownload.outerHTML}</li>` +audioLogOutput.innerHTML;
    resolve(blob);
  });
}

const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const logOutput = document.getElementById('log');
const audioLogOutput = document.getElementById('audioLog');
const startRecording = document.getElementById('startRecording');
const stopRecording = document.getElementById('stopRecording');
const stopAudio = document.getElementById('stopAudio');
const pauseAudio = document.getElementById('pauseAudio');
const playAudio = document.getElementById('playAudio');
const replayAudio = document.getElementById('replayAudio');

/*
// If using client secret
avs.getCodeFromUrl()
 .then(code => avs.getTokenFromCode(code))
.then(token => localStorage.setItem('token', token))
.then(refreshToken => localStorage.setItem('refreshToken', refreshToken))
.then(() => avs.requestMic())
.then(() => avs.refreshToken())
.catch(() => {

});
*/

avs.getTokenFromUrl()
.then(() => avs.getToken())
.then(token => localStorage.setItem('token', token))
.then(() => avs.requestMic())
.catch(() => {
  const cachedToken = localStorage.getItem('token');

  if (cachedToken) {
    avs.setToken(cachedToken);
    return avs.requestMic();
  }
});

loginBtn.addEventListener('click', login);

function login(event) {
  return avs.login()
  .then(() => avs.requestMic())
  .catch(() => {});

  /*
  // If using client secret
  avs.login({responseType: 'code'})
  .then(() => avs.requestMic())
  .catch(() => {});
  */
}

logoutBtn.addEventListener('click', logout);

function logout() {
  return avs.logout()
  .then(() => {
    localStorage.removeItem('token');
    window.location.hash = '';
  });
}

startRecording.addEventListener('click', () => {
  avs.startRecording();
});

stopRecording.addEventListener('click', () => {
  avs.stopRecording().then(dataView => {
    avs.player.emptyQueue()
    .then(() => avs.audioToBlob(dataView))
    .then(blob => logAudioBlob(blob, 'VOICE'))
    .then(() => avs.player.enqueue(dataView))
    .then(() => avs.player.play())
    .catch(error => {
      console.error(error);
    });

        var ab = false;
    //sendBlob(blob);
    avs.sendAudio(dataView)
    .then(({xhr, response}) => {

      var promises = [];
      var audioMap = {};
      var directives = null;

      if (response.multipart.length) {
        response.multipart.forEach(multipart => {
          let body = multipart.body;
          if (multipart.headers && multipart.headers['Content-Type'] === 'application/json') {
            try {
              body = JSON.parse(body);
            } catch(error) {
              console.error(error);
            }

            if (body && body.messageBody && body.messageBody.directives) {
              directives = body.messageBody.directives;
            }
          } else if (multipart.headers['Content-Type'] === 'audio/mpeg') {
            const start = multipart.meta.body.byteOffset.start;
            const end = multipart.meta.body.byteOffset.end;

            /**
             * Not sure if bug in buffer module or in http message parser
             * because it's joining arraybuffers so I have to this to
             * seperate them out.
             */
            var slicedBody = xhr.response.slice(start, end);

            //promises.push(avs.player.enqueue(slicedBody));
            audioMap[multipart.headers['Content-ID']] = slicedBody;
          }
        });

        function findAudioFromContentId(contentId) {
          contentId = contentId.replace('cid:', '');
          for (var key in audioMap) {
            if (key.indexOf(contentId) > -1) {
              return audioMap[key];
            }
          }
        }

        directives.forEach(directive => {
          if (directive.namespace === 'SpeechSynthesizer') {
            if (directive.name === 'speak') {
              const contentId = directive.payload.audioContent;
              const audio = findAudioFromContentId(contentId);
              if (audio) {
                avs.audioToBlob(audio)
                .then(blob => logAudioBlob(blob, 'RESPONSE'));
                promises.push(avs.player.enqueue(audio));
              }
            }
          } else if (directive.namespace === 'AudioPlayer') {
            if (directive.name === 'play') {
              const streams = directive.payload.audioItem.streams;
              streams.forEach(stream => {
                const streamUrl = stream.streamUrl;

                const audio = findAudioFromContentId(streamUrl);
                if (audio) {
                  avs.audioToBlob(audio)
                  .then(blob => logAudioBlob(blob, 'RESPONSE'));
                  promises.push(avs.player.enqueue(audio));
                } else if (streamUrl.indexOf('http') > -1) {
                  const xhr = new XMLHttpRequest();
                  const url = `/parse-m3u?url=${streamUrl.replace(/!.*$/, '')}`;
                  xhr.open('GET', url, true);
                  xhr.responseType = 'json';
                  xhr.onload = (event) => {
                    const urls = event.currentTarget.response;

                    urls.forEach(url => {
                      avs.player.enqueue(url);
                    });
                  };
                  xhr.send();
                }
              });
            } else if (directive.namespace === 'SpeechRecognizer') {
              if (directive.name === 'listen') {
                const timeout = directive.payload.timeoutIntervalInMillis;
                // enable mic
              }
            }
          }
        });

        if (promises.length) {
          Promise.all(promises)
         .then(() => {
            avs.player.playQueue()
          });
        }
      }

    })
    .catch(error => {
      console.error(error);
    });
  });
});

stopAudio.addEventListener('click', (event) => {
  avs.player.stop();
});

pauseAudio.addEventListener('click', (event) => {
  avs.player.pause();
});

playAudio.addEventListener('click', (event) => {
  avs.player.play();
});

replayAudio.addEventListener('click', (event) => {
  avs.player.replay();
});

function sendBlob(blob) {
  const xhr = new XMLHttpRequest();
  const fd = new FormData();

  fd.append('fname', 'audio.wav');
  fd.append('data', blob);

  xhr.open('POST', 'http://localhost:5555/audio', true);
  xhr.responseType = 'blob';

  xhr.onload = (event) => {
    if (xhr.status == 200) {
      console.log(xhr.response);
      //const responseBlob = new Blob([xhr.response], {type: 'audio/mp3'});
    }
  };

  xhr.send(fd);
}
/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
        http://aws.amazon.com/apache2.0/
    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * This simple sample has no external dependencies or session management, and shows the most basic
 * example of how to create a Lambda function for handling Alexa Skill requests.
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, tell Hello World to say hello"
 *  Alexa: "Hello World!"
 */

/**
 * App ID for the skill
 */
var APP_ID = "amzn1.application-oa2-client.696ab90fc5844fdbb8efc17394a79c00"; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * HelloWorld is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var HelloWorld = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
HelloWorld.prototype = Object.create(AlexaSkill.prototype);
HelloWorld.prototype.constructor = HelloWorld;

HelloWorld.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("HelloWorld onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

HelloWorld.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("HelloWorld onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Welcome to the Alexa Skills Kit, you can say hello";
    var repromptText = "You can say hello";
    response.ask(speechOutput, repromptText);
};

HelloWorld.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("HelloWorld onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

HelloWorld.prototype.intentHandlers = {
    // register custom intent handlers
    "TestIntent": function (intent, session, response) {
        response.tellWithCard("Hello World!", "Hello World", "Hello World!");
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can say hello to me!", "You can say hello to me!");
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HelloWorld skill.
    var helloWorld = new HelloWorld();
    helloWorld.execute(event, context);
};
