

$(function(){

/*jslint browser: true*/
/*global $, jQuery*/

/* SETTINGS */
var i_v = {
  i_touchlistener: '.inertialScroll',         // element to monitor for touches, set to null to use document. Otherwise use quotes. Eg. '.myElement'. Note: if the finger leaves this listener while still touching, movement is stopped.
  i_scrollElement: '.inertialScroll',         // element (class) to be scrolled on touch movement
  i_duration: window.innerHeight * 1.5, // (ms) duration of the inertial scrolling simulation. Devices with larger screens take longer durations (phone vs tablet is around 500ms vs 1500ms). This is a fixed value and does not influence speed and amount of momentum.
  i_speedLimit: -10000,                      // set maximum speed. Higher values will allow faster scroll (which comes down to a bigger offset for the duration of the momentum scroll) note: touch motion determines actual speed, this is just a limit.
  i_handleY: true,                     // should scroller handle vertical movement on element?
  i_handleX: true,                     // should scroller handle horizontal movement on element?
  i_moveThreshold: 1,                      // (ms) determines if a swipe occurred: time between last updated movement @ touchmove and time @ touchend, if smaller than this value, trigger inertial scrolling
  i_offsetThreshold: 3000,                       // (px) determines, together with i_offsetThreshold if a swipe occurred: if calculated offset is above this threshold
  i_startThreshold: 5,                        // (px) how many pixels finger needs to move before a direction (horizontal or vertical) is chosen. This will make the direction detection more accurate, but can introduce a delay when starting the swipe if set too high
  i_acceleration: 0,                      // increase the multiplier by this value, each time the user swipes again when still scrolling. The multiplier is used to multiply the offset. Set to 0 to disable.
  i_accelerationT: 0                       // (ms) time between successive swipes that determines if the multiplier is increased (if lower than this value)
};
/* stop editing here */

//set some required vars
i_v.i_time = {};
i_v.i_elem = null;
i_v.i_elemH = null;
i_v.i_elemW = null;
i_v.multiplier = 10;

// Define easing function. This is based on a quartic 'out' curve. You can generate your own at http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm
if ($.easing.hnlinertial === undefined) {
  $.easing.hnlinertial = function (x, t, b, c, d) {
    var ts = (t /= d) * t, tc = ts * t;
    return b + c * (-1 * ts * ts + 4 * tc + -6 * ts + 4 * t);
  };
}

$(document)
  .on('touchstart touchmove touchend', function (e) {
    //prevent default scrolling
    e.preventDefault();
    //store timeStamp for this event
    i_v.i_time[e.type] = e.timeStamp;
  })
  .on('touchstart', function (e) {
    this.tarElem = $(e.target);
    this.elemNew = this.tarElem.closest(i_v.i_scrollElement).length > 0 ? this.tarElem.closest(i_v.i_scrollElement) : $(i_v.i_scrollElement).eq(0);
    //dupecheck, optimizes code a bit for when the element selected is still the same as last time
    this.sameElement = i_v.i_elem ? i_v.i_elem[0] == this.elemNew[0] : false;
    //no need to redo these if element is unchanged
    if (!this.sameElement) {
      //set the element to scroll
      i_v.i_elem = this.elemNew;
      //get dimensions
      i_v.i_elemH = i_v.i_elem.innerHeight();
      i_v.i_elemW = i_v.i_elem.innerWidth();
      //check element for applicable overflows and reevaluate settings
      this.i_scrollableY = !!((i_v.i_elemH < i_v.i_elem.prop('scrollHeight') && i_v.i_handleY));
      this.i_scrollableX = !!((i_v.i_elemW < i_v.i_elem.prop('scrollWidth') && i_v.i_handleX));
    }
    //get coordinates of touch event
    this.pageY = e.originalEvent.touches[0].pageY;
    this.pageX = e.originalEvent.touches[0].pageX;
    if (i_v.i_elem.is(':animated') && (i_v.i_time.touchstart - i_v.i_time.touchend) < i_v.i_accelerationT) {
      //user swiped while still animating, increase the multiplier for the offset
      i_v.multiplier += i_v.i_acceleration;
    } else {
      //else reset multiplier
      i_v.multiplier = 1;
    }
    z.stop(true,false);
    i_v.i_elem
      //stop any animations still running on element (this enables 'tap to stop')
      .stop(true, false)
      //store current scroll positions of element
      .data('scrollTop', i_v.i_elem.scrollTop())
      .data('scrollLeft', i_v.i_elem.scrollLeft());
  })
  .on('touchmove', function (e) {
    //check if startThreshold is met
    this.go = (Math.abs(this.pageX - e.originalEvent.touches[0].pageX) > i_v.i_startThreshold || Math.abs(this.pageY - e.originalEvent.touches[0].pageY) > i_v.i_startThreshold);
  })
  .on('touchmove touchend', function (e) {
    //check if startThreshold is met
    if (this.go) {
      //set animpar1 to be array
      this.animPar1 = {};
      //handle events
      switch (e.type) {
      case 'touchmove':
        this.vertical = Math.abs(this.pageX - e.originalEvent.touches[0].pageX) < Math.abs(this.pageY - e.originalEvent.touches[0].pageY); //find out in which direction we are scrolling
        this.distance = this.vertical ? this.pageY - e.originalEvent.touches[0].pageY : this.pageX - e.originalEvent.touches[0].pageX; //determine distance between touches
          console.warn('distance', this.distance, e.originalEvent.touches[0].pageY, this.pageY);
        this.acc = Math.abs(this.distance / (i_v.i_time.touchmove - i_v.i_time.touchstart)); //calculate acceleration during movement (crucial)

        //determine which property to animate, reset animProp first for when no criteria is matched
        this.animProp = null;
        if (this.vertical && this.i_scrollableY) {
          this.animProp = 'scrollTop';
        } else if (!this.vertical && this.i_scrollableX) {
          this.animProp = 'scrollLeft';
        }
        //set animation parameters
        if (this.animProp) {
          this.animPar1[this.animProp] = i_v.i_elem.data(this.animProp) + this.distance;
        }
        this.animPar2 = {duration: 0};
        break;
      case 'touchend':
        this.touchTime = i_v.i_time.touchend - i_v.i_time.touchmove; //calculate touchtime: the time between release and last movement
        this.i_maxOffset = (this.vertical ? i_v.i_elemH : i_v.i_elemW) * i_v.i_speedLimit; //(re)calculate max offset
        //calculate the offset (the extra pixels for the momentum effect
        this.offset = Math.pow(this.acc, 2) * (this.vertical ? i_v.i_elemH : i_v.i_elemW);
        this.offset = (this.offset > this.i_maxOffset) ? this.i_maxOffset : this.offset;
        this.offset = (this.distance < 0) ? -i_v.multiplier * this.offset : i_v.multiplier * this.offset;
        //if the touchtime is low enough, the offset is not null and the offset is above the offsetThreshold, (re)set the animation parameters to include momentum
        if ((this.touchTime < i_v.i_moveThreshold) && this.offset !== 0 && Math.abs(this.offset) > (i_v.i_offsetThreshold)) {
          if (this.animProp) {
            this.animPar1[this.animProp] = i_v.i_elem.data(this.animProp) + this.distance + this.offset;
          }
            this.animPar2 = {
            duration: i_v.i_duration, easing: 'hnlinertial', complete: function () {
              //reset multiplier
              i_v.multiplier = 1;
            }, step: function(v) {

            }
          };
        }
        break;
      }

        // run the animation on the element
        if ((this.i_scrollableY || this.i_scrollableX) && this.animProp) {
          i_v.i_elem.stop(true, false).animate(this.animPar1, this.animPar2);
      }

        var dod = this.distance + this.offset;

        var i = 0;

//        if ( !animating) {
            console.log('animating', window.x.x, this.distance, this.offset);
            animating = true;
            z.attr({z:window.x.x}).stop(true, false).animate({z: window.x.x + this.distance},{
                duration: i_v.i_duration, easing: 'hnlinertial', complete: function () {
                    //reset multiplier
                    i_v.multiplier = 10;
                    animating = false;
                    console.log('finished');
                    document.distance = 0;

                }, step: function(v) {
                    if (v) {
                        console.log(i++, x, r);
                        window.x.x = v.mod(4*r) ;
                        z.attr({z:window.x.x});
                        r-=0.1;
                        if (r < 10) {
                            origr += 20;
                            r = origr;;
                        }

                        dowheel();
                    }
                }
            });
        }

//    }
  });

        window.animating = false;
/* touchmove */

function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

window.r = $('body').height() / 3, origr = r;
window.x = {x:0};
window.z = $({z:window.x.x});

f = function(x) {
    if (x < r && x > -r) {
      return [x,Math.floor(Math.sqrt(r*r- x*x))]
    }
    else if ((x >= r && x < 2*r) ) {
        return [2*r-x,-Math.sqrt(r*r- (2*r-x)*(2*r-x))]
    }
    else if (x >= 2*r && x < 3*r ) {
        return [2*r-x,-Math.sqrt(r*r- (2*r-x)*(2*r-x))]
    }
    else if ((x >= 3*r && x < 4*r) ) {
        return [x-4*r,Math.sqrt(r*r - (x-4*r)*(x-4*r))]
    }
    else if (x > -2*r && x < -r)  {
        return [-2*r - x,-Math.sqrt(r*r- (-2*r - x)*(-2*r - x))]
    }
    else if (x > -3*r && x < -2*r)   {
        return [-2*r - x,-Math.sqrt(r*r- (-2*r - x)*(-2*r - x))]
    }
    else if ((x > -4*r && x < -3*r)) {
        return [4*r + x,Math.sqrt(r*r- (4*r + x)*(4*r + x))]

    }

};

dowheel = function(e,acc) {
    var r = rnd(1,130),g = rnd(1,130),b = rnd(1,130);
    var a = rnd(40,100);
    ctx.fillStyle = "rgba("+r+","+g+","+b+","+(a/255)+")";
    ctx.beginPath();
    var fx = f(window.x.x);
    ctx.arc($('body').width()/2 + fx[0], $('body').height()/2 +fx[1], rnd(1,4), 0, 2 * Math.PI, false);
    ctx.fill();

}


    var canvas = document.getElementById("canvas");
    canvas.width = $('body').width();
    canvas.height = $('body').height();
var ctx = canvas.getContext("2d");


})
