// Will do in the future:
// 1. fix each stretch!!!
// 2. fix prev / next button when fix var is true
// 3. add infinite support
// 4. add pause and stop buttons
// 5. add fade animation support
// 6. add progress bar
// 7. add css animation support
// 8. add touch support
// 9. add callbacks

;+function($) {

    $.extend($.easing, {
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        }
    });

    function ceil(v) { return v > ~~v ? ~~++v : v }
    // function abs(v) { return v > 0 ? v : -v }
    // function round(v) { return v - ~~v < 0.5 ? ~~v : ~~++v }
    // function sign(v) { return v > 0 ? 1 : -1 }

    var defaults = {

        // GENERAL
        style: 'ss-slider',
        vertical: false,
        infinite: false,
        reverse: false,//true,
        sync: false,
        switchTime: 1000,
        showTime: 1000,
        animation: 'easeInOutCubic',//'easeOutBounce',//'swing',
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
            create: true,
            tag: 'nav',
            itemTag: 'a',
            style: 'ss-pager',
            vertical: false,
            stretch: true,
            numbers: true,
            activeStyle: '-active'
        },

        progress: {
            create: true
        }
    };

    $.fn.syncSlider = function(userSettings) {

        var _h = 'height',
            _w = 'width',
            _ = $(this),
            r = {}, // object for return
            m = {}, // top / left movement object
            w,  // tape wrapper
            o, // all options
            p, // pager
            i, // current slide index
            j = {}, // temporary variable
            n, // source slides number
            N, // all slides number
            x, // movement step
            ax, // abs of movement step x
            d, // forward / backward direction (1, -1)
            l, // last possible slide index
            ni, // navigation item
            t, // tape
            ti, // tape items array
            tis, // tape item size (width / height)
            fix, // fix step if necessary
            I, // previous i
            calc, // function for i calculation
            wait, // wait time for show and animation
            tout, // setTimeout function
            pi, // pager items array
            si; // top / left and width / height style keywords (si.de, si.ze)

        // If element is not exist
        if(_.length == 0) return _;

        // Support multiple elements
        if(_.length > 1) {
            _.each(function(){$(_).syncSlider(userSettings)});
            return _;
        }

        // Initializing function
        function init() {

            // Merge user-supplied options with the defaults
            o = $.extend({}, defaults, userSettings);

            // Wrap stripe into div
            o.wrap ? (t = _) && (w = _.wrap($(document.createElement('div')).addClass(o.wrapperStyle)).parent()) :
                     (w = _) && (t = _.children(o.stripe.tag));

            // Set time for show and animation
            wait = function() { return o.switchTime + o.showTime };

            // Horizontal or vertical settings
            o.vertical ? si = { de: 'top', ze: _h } : si = { de: 'left', ze: _w };
            m[si.de] = 0;

            ti = t.children(o.stripe.itemTag);  // set reference to the tape items
            tis = 100 / o.display;              // set slide width/ height
            n = N = ti.length;                  // set slides count
            l = N - o.display;                  // last possible slide index
            x = o.step;                         // set movement step
            ax = x > 0 ? x : -x;                // absolutely step
            fix = l < ax ? 0 : x % l;           // fix step is necessary

            // Add left and right navigation buttons
            if (o.nav.create) {
                ni = $(document.createElement(o.nav.itemTag));
                w.append(ni.clone().addClass(o.nav.prevStyle).text(o.nav.prevText).on('click', function() {
                    r.switchToPrev();
                }));
                w.append(ni.addClass(o.nav.nextStyle).text(o.nav.nextText).on('click', function() {
                    r.switchToNext();
                }));
            }

            // Add pager
            if (o.pager.create) {
                var arr = [],
                    num = o.pager.numbers ? function(v) { return v + 1; } : function() { return '' },
                    tag = o.pager.itemTag + '>';
                for (j = 0; j < ceil(l / ax) + 1; ++j) { arr.push('<' + tag + num(j) + '</' + tag); }
                p = $(document.createElement(o.pager.tag)).addClass(o.pager.style).append(arr.join(''));
                w.append(p); // add pager to wrapper

                // Set pager items size and add events
                pi = p.children(o.pager.itemTag).each(function(index, elem) {
//** fix each stretch!!!
                    o.pager.stretch ? $(elem).css(o.pager.vertical ? _h : _w, 100 / n + '%') : 0;
                    var i = index * ax;
                    $(elem).on('click', fix ? function() { r.switchTo((i > l ? l : i) + 1) } :
                        function() { r.switchTo(i + 1) });
                });

                // Set active start pager item
                pi.eq(o.startSlide - 1).addClass(o.pager.activeStyle);

                // Return current pager index
                r.getCurrentPager = ax < 2 ?
                    function() { return r.getCurrentSlide() } :
                    function() { return ceil((r.getCurrentSlide() - 1) / ax) + 1 };

                var toPager = ax < 2 ? function() { return I } : function() { return ceil(I / ax) };
                function tgPager(v) { pi.eq(v).toggleClass(o.pager.activeStyle); } // toggle pager style

                r.switchPagerTo = function(v) {
                    tgPager(toPager());
                    tgPager(v - 1);
                    I = r.getCurrentSlide() - 1;
                };

                j = function(v) { setSlide(v); r.switchPagerTo(r.getCurrentPager()); };
            } else j = setSlide;
            r.switchTo = r.setSlide = j;

            if (o.infinite) {
                // Will do this in the future
                l = N - o.display;
            } else {
                d = x > 0 ? 1 : -1;
                x = d * x > l ? d * l : x;

                if (o.reverse) {
                    calc = fix ? function() {
                        i = d > 0 ? l - x * (i == l + x) : -x * (i == x); x *= -1;
                    } : function() { i -= 2 * x; x *= -1; };
                }
                else {
                    var lim = x > 0 ? l : 1,
                        end = x < 0 ? l : 0;
                    calc = fix ? function() { i = x > i - lim ? l : 0; } : function() { i = end; };
                }
            }

            i = I = o.startSlide - 1;      // set current slide
             t.css(si.de, -tis * i + '%'); // set tape start position
             t.css(si.ze,  tis * N + '%'); // set tape size
            ti.css(si.ze,  100 / N + '%'); // set tape items sizes

            // Return current slide index
            r.getCurrentSlide = o.infinite ? function() { return i % n + 1 } : function() { return i + 1 };

            // Auto play
            o.autoStart ? r.play() : 0;
        }

        function setSlide(v) {
            t.stop();
            i = v - 1;
            d = (i > l) - (i < 0) ? calc() : 0; // start / end correction
            m[si.de] = -tis * i + '%'; // movement in a certain direction
            t.animate(m, o.switchTime, o.animation); // switch animation
        }

        function repeatAfter(ms) {
            tout = setTimeout(function() {
                r.switchToNext();
                clearTimeout(tout);
                repeatAfter(wait());
            }, ms);
        }

        r.play = function() {
            clearTimeout(tout);
            //r.pause();
            repeatAfter(o.showTime);
        };

        r.switchToPrev = function() {
            r.switchTo(i + 1 - x);
        };

        r.switchToNext = function() {
            r.switchTo(i + 1 + x);
        };

        init();
        return r;
    }
}(jQuery);
