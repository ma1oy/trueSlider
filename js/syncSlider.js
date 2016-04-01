;+function($) {

    var defaults = {

        // GENERAL
        style: 'ss-slider',
        vertical: false,
        infinite: false,
        sync: false,
        switchTime: 1000,
        showTime: 1000,
        // easing: 'swing',//'easeInOutCubic',
        startSlide: 1,
        display: 4,
        step: 2,
        autoStart: true,

        // WRAPPER
        wrap: true,
        wrapperStyle: 'ss-wrapper',

        stripe: {
            tag: 'ul',
            itemTag: 'li'
        },

        nav: {
            create: true,
            tag: 'nav',
            itemTag: 'a',
            style: 'ss-nav',
            prevStyle: 'ss-prev',
            prevText: 'Previous',
            nextStyle: 'ss-next',
            nextText: 'Next'
        },

        pager: {
            create: false,
            tag: 'nav',
            itemTag: 'a',
            style: 'ss-pager',
            vertical: false,
            autoSize: true,
            numbers: false,
            activeStyle: '-active'
        },

        progress: {
            create: true
        }
    };

    $.fn.syncSlider = function(userSettings) {

        var t = $(this),
            o, // all options
            r = {}, // object for return
            s, // stripe
            i, // current slide
            n, // source slides number
            N, // all slides number
            slideSize, // slide width / height
            calci, // function for i calculation
            wait, // wait time for show and animation
            timeout, // setTimeout function
            dir, // forward / backward direction
            pos = {}, // top / left movement object
            side; // top / left movement style keyword

        // If element is not exist
        if(t.length == 0) return t;

        // Support multiple elements
        if(t.length > 1) {
            this.each(function(){$(t).syncSlider(userSettings)});
            return t;
        }

        // Initializing function
        function init() {

            var w, // stripe wrapper
                a, // stripe items array

                size; // stripe width / height style keyword

            // Merge user-supplied options with the defaults
            o = $.extend({}, defaults, userSettings);

            // Set reference to the stripe items
            a = t.children(o.stripe.itemTag);

            // Wrap stripe into div
            if (o.wrap) {
                s = t;
                w = t.wrap($(document.createElement('div')).addClass(o.wrapperStyle)).parent();
            }
            else {
                s = t.children(o.stripe.tag);
                w = t;
            }

            // Horizontal or vertical settings
            if (s.vertical) {
                side = 'top';
                size = 'height';
                // pos = { top: 0 };
            } else {
                side = 'left';
                size = 'width';
                // pos = { left: 0 };
            }
            pos[side] = 0;

            // Add left and right navigation buttons
            if (o.nav.create) {
                var navItem = $(document.createElement(o.nav.itemTag));
                w.append(navItem.clone().addClass(o.nav.prevStyle).text(o.nav.prevText).on('click', function() {
                    r.switchToPrev();
                }));
                w.append(navItem.addClass(o.nav.nextStyle).text(o.nav.nextText).on('click', function() {
                    r.switchToNext();
                }));
            }

            n = N = a.length;                  // set slides count
            i = o.startSlide - 1;              // set current slide
            slideSize = 100 / o.display;       // set slide width/ height

            if (s.infinite) {
                // Will do this in the future
            } else {
                var last = N - o.display;
                var limit = o.step + (o.step > 0 ? last : 1);
                calci = function() { i = i < limit ? last : 0; };
            }

            s.css(side, -slideSize * i + '%'); // set stripe start position
            s.css(size,  slideSize * N + '%'); // set new stripe size
            a.css(size,        100 / N + '%'); // set new stripe items sizes

            // Set time for show and animation
            wait = function() {  return o.switchTime + o.showTime };

            // Set switch functions
            r.switchTo = r.setSlide = o.pager.create ? function(v) {
                // setSlide(v);
                // r.switchPagerTo(r.getCurrentSlide());
            } : setSlide;

            // Auto play
            if (o.autoStart) r.play();
        }

        function setSlide(v) {
            s.stop();
            i = v;
            if (dir = (i + o.display > N) - (i < 0)) calci();
            //if (i + s.display > N) { calci(-1); }
            //if (i             < 0) { calci( 1); }

            // movement in a certain direction
            pos[side] = -slideSize * i + '%';
            console.log('move' + i);
            // switch animation
            s.animate(pos, o.switchTime, 'swing');
            // Here will be another system of animation
        }

        function repeatAfter(ms) {
            timeout = setTimeout(function() {
                r.switchToNext();
                clearTimeout(timeout);
                repeatAfter(wait());
            }, ms);
        }

        r.play = function() {
            clearTimeout(timeout);
            //r.pause();
            repeatAfter(o.showTime);
        };

        r.switchToPrev = function() {
            r.switchTo(i - o.step);
        };

        r.switchToNext = function() {
            r.switchTo(i + o.step);
        };

        init();
        return r;
    }
}(jQuery);
