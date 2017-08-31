'use strict'

var final_transcript = '';
var recognizing = false;
var ignore_onend;
var start_timestamp;

var recognitionTab = [];
var option = []

// Speech Recognition
function initRecognition(adcId, translateText, targetLanguage, emotionA, sentimentA) {
    
    option[adcId] = {translateT:translateText, target:targetLanguage, emotion:emotionA, sentiment:sentimentA, emotionDone:false, sentimentDone:false};
    
    if (!('webkitSpeechRecognition' in window)) {
    	document.getElementById("warning_" + adcId).innerHTML = 'Web Speech API is not supported by this browser. Upgrade to <a href="//www.google.com/chrome">Chrome</a> version 25 or later.';
       	document.getElementById("warning_" + adcId).style.display = "initial";
	    document.getElementById("speech-container").style.display = "none";
  } else {
      recognitionTab[adcId] = new webkitSpeechRecognition();
      recognitionTab[adcId].continuous = true;
      recognitionTab[adcId].interimResults = true;

      recognitionTab[adcId].onstart = function () {
          recognizing = true;
          document.getElementById("message_" + adcId).innerHTML = 'Speak now.';
          document.getElementById("icon_" + adcId).innerHTML = 'pause_circle_outline';
          document.getElementById("language_" + adcId).disabled = true;
      };

      recognitionTab[adcId].onresult = function (event) {
          //var interim_transcript = '';
          for (var i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                  final_transcript += event.results[i][0].transcript;
              } /*else {
                  interim_transcript += event.results[i][0].transcript;
              }*/
       }

    //final_transcript = LanguageApp.translate(final_transcript, sourceLang, targetLang);
      
          //interim_span.innerHTML = interim_transcript;
  };

      recognitionTab[adcId].onend = function () {
          if (option[adcId].translateT == "true") {
          	translate(adcId, final_transcript, option[adcId].target, option[adcId].sentiment, option[adcId].emotion, option);
          } else {
          	document.getElementById("final_answer_"+adcId).innerHTML = final_transcript;
            {% If CurrentADC.PropValue("doAnalysis") = "1" Then%}
                sentimentAnalysis(adcId, final_transcript, option);
                emotionAnalysis(adcId, final_transcript, option);
            {%EndIf%}
            document.getElementById('wait').innerHTML = "Sentiment analysis done.";
          }
          recognizing = false;
          
          if (ignore_onend) {
              return;
          }
          //speechMyText(final_transcript);
          if (!final_transcript) {
              document.getElementById("message_" + adcId).innerHTML = 'Click "Talk" and begin speaking.';
              document.getElementById("icon_" + adcId).innerHTML = 'mic';
              document.getElementById("language_" + adcId).disabled = false;
              return;
          }
      };

      recognitionTab[adcId].onerror = function (event) {
          if (event.error == 'no-speech') {
              document.getElementById("message_" + adcId).innerHTML = 'No speech was detected.';
              ignore_onend = true;
          }
          if (event.error == 'audio-capture') {
              document.getElementById("message_" + adcId).innerHTML = 'No microphone was found. Ensure that a microphone is installed.';
              ignore_onend = true;
          }
          if (event.error == 'not-allowed') {
              if (event.timeStamp - start_timestamp < 100) {
                  document.getElementById("message_" + adcId).innerHTML = 'Permission to use microphone is blocked. To change, go to chrome://settings/contentExceptions#media-stream';
              } else {
                  document.getElementById("message_" + adcId).innerHTML = 'Permission to use microphone was denied.';
              }
              ignore_onend = true;
          }
      };

  }
}

function talkWithApp(event, adcId) {
    event.preventDefault();
    if (recognizing) {
        recognitionTab[adcId].stop();
        document.getElementById("message_" + adcId).innerHTML = 'Click "Talk" and begin speaking.';
        document.getElementById("icon_" + adcId).innerHTML = 'mic';
        document.getElementById("language_" + adcId).disabled = false;
        return;
    }
    final_transcript = '';
    recognitionTab[adcId].lang = document.getElementById("language_"+adcId).value;
    recognitionTab[adcId].start();
    ignore_onend = false;
    document.getElementById("final_answer_" + adcId).innerHTML = '';
   // interim_span.innerHTML = '';
    document.getElementById("message_" + adcId).innerHTML = 'Click the "Allow" button above to enable your microphone.';
    start_timestamp = event.timeStamp;
}

// Speech Synthesis
function speechMyText(textToSpeech) {
    var u = new SpeechSynthesisUtterance();
    u.text = textToSpeech;
    u.lang = document.getElementById("language_"+adcId).value;
    u.rate = 1.0;
    u.onend = function (event) {}
    speechSynthesis.speak(u);
}

function translate(adcId, final_transcript, target, sentimentA, emotionA, option){
    var sourceLang = document.getElementById("language_"+adcId).value.substr(0,2);
    var targetLang = target;
              
    var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sourceLang + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(final_transcript);
	var result;          
	fetch(url).then(res => res.json()).then((out) => {
        document.getElementById("final_answer_"+adcId).innerHTML = out[0][0][0];
        {% If CurrentADC.PropValue("doAnalysis") = "1" Then%}
            sentimentAnalysis(adcId, out[0][0][0], option);
            emotionAnalysis(adcId, out[0][0][0], option);
        {%EndIf%}
    }).catch(err => console.error(err));
}

function emotionAnalysis(adcId, final_transcript, option){
    var request = new XMLHttpRequest();
    request.open('POST', 'https://apis.paralleldots.com/emotion');
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    request.setRequestHeader('Accept', 'text/html');

    request.onreadystatechange = function () {
        if (this.readyState === 4) {
            /*console.log('Status:', this.status);
            console.log('Headers:', this.getAllResponseHeaders());*/
            var response = JSON.parse(this.responseText);
            document.getElementById('emotion_'+adcId).innerHTML = response.emotion;
            if (!option[adcId].sentimentDone){
                document.getElementById('wait').innerHTML = "Emotion analysis done, Please wait for the sentiment analysis.";
            } else {
                document.getElementById('wait').innerHTML = "Analysis done.";
            }
            option[adcId].emotionDone = true;
        }
    };
    
    var requestText = "text=" + encodeURI(final_transcript) + "&apikey=4gz3H75jU4ErgxbzrwamSgQgCCk52BfedQA8fozYqwE";
    //console.log(requestText);
    request.send(requestText);        
}

function sentimentAnalysis(adcId, textR, option){
	var url = 'https://apis.paralleldots.com/sentiment?sentence1=' + textR + '&apikey=4gz3H75jU4ErgxbzrwamSgQgCCk52BfedQA8fozYqwE';
	fetch(url).then(res => res.json()).then((out) => {
        document.getElementById('sentiment_'+adcId).innerHTML = out.sentiment +'';
        if (!option[adcId].emotionDone){
        	document.getElementById('wait').innerHTML = "Sentiment analysis done, Please wait for the emotion analysis.";
        } else {
            document.getElementById('wait').innerHTML = "Analysis done.";
        }
        option[adcId].sentimentDone = true;
    }).catch(err => console.error(err));      
}

function hideShow(adcId) {
    event.preventDefault();
    var x = document.getElementById('answerContainer_'+adcId);
    var y = document.getElementById('icon_vis_'+adcId);
    if (x.style.display === 'none') {
        x.style.display = 'block';
        y.innerHTML='visibility_off'
    } else {
        x.style.display = 'none';
        y.innerHTML='visibility'
    }
}