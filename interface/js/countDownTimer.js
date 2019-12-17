var timeinterval;
// Set the date we're counting down to

function getTimeRemaining(endtime) {
    var t = Date.parse(endtime) - Date.parse(new Date());
    if(t<=0){
        t = 0;
        var seconds = 0;
        var minutes = 0;
        var hours = 0;
        var days = 0;
    }else{
        var seconds = Math.floor((t / 1000) % 60);
        var minutes = Math.floor((t / 1000 / 60) % 60);
        var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
        var days = Math.floor(t / (1000 * 60 * 60 * 24));
    }
    return {
        'total': t,
        'days': days,
        'hours': hours,
        'minutes': minutes,
        'seconds': seconds
    };
}

function initializeClock(id, endtime) {
    clearInterval(timeinterval);
    var clock = document.getElementById(id);
    var daysSpan = clock.querySelector('.days');
    var hoursSpan = clock.querySelector('.hours');
    var minutesSpan = clock.querySelector('.minutes');
    var secondsSpan = clock.querySelector('.seconds');
    
    function updateClock() {
        //console.log('Update Clock');
        var t = getTimeRemaining(endtime);
        daysSpan.innerHTML = t.days;
        hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
        minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
        secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);
        if (t.total <= 0) {
            clearInterval(timeinterval);
        }
    }
    updateClock();
    timeinterval = setInterval(updateClock, 1000);
}

function validateDateTime(dateTime){
  if (!Date.parse(dateTime)){ 
     return false; 
  } else { 
    return true; 
  }
}