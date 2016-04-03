;+function($) {

    $.extend($.easing, {
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        }
    });

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

        var _ = $(this),
            _h = 'height',
            _w = 'width',
            r = {}, // object for return
            m = {}, // top / left movement object
            o, // all options
            t, // tape
            p, // pager
            i, // current slide index
            n, // source slides number
            N, // all slides number
            x, // movement step
            d, // forward / backward direction (1, -1)
            tis, // tape item size (width / height)
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

            var w,  // tape wrapper
                ti; // tape items array

            // Merge user-supplied options with the defaults
            o = $.extend({}, defaults, userSettings);

            // Set reference to the tape items
            ti = _.children(o.stripe.itemTag);

            n = N = ti.length;               // set slides count
            x = o.step;                     // set movement step

            // Wrap stripe into div
            o.wrap ? (t = _) && (w = _.wrap($(document.createElement('div')).addClass(o.wrapperStyle)).parent()) :
                     (w = _) && (t = _.children(o.stripe.tag));

            // Horizontal or vertical settings
            o.vertical ? si = { de: 'top', ze: _h } : si = { de: 'left', ze: _w };
            m[si.de] = 0;

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

            // Add pager
            if (o.pager.create) {
                var arr = [],
                    npi = ~~(n / x), // number of pager items
                    num = o.pager.numbers ? function(v) { return v + 1; } : function() { return '' };
                for (var j = 0; j < npi; ++j) {
                    arr.push('<' + o.pager.itemTag + '>' + num(j) + '</' + o.pager.itemTag + '>')
                }
                p = $(document.createElement(o.pager.tag)).addClass(o.pager.style).append(arr.join(''));
                w.append(p); // add pager to wrapper

                // Set pager items size and add events
                pi = p.children(o.pager.itemTag).each(function(index, elem) {
                    o.pager.stretch ? $(elem).css(o.pager.vertical ? _h : _w, 100 / n + '%') : 0;
                    $(elem).on('click', function() { r.switchTo(index * x + 1) })
                });

                // set active start pager item
                pi.eq(o.startSlide - 1).addClass(o.pager.activeStyle);
            }

            if (o.infinite) {
                // Will do this in the future
            } else {
                var lst = n - o.display, // last i
                    fix = lst < Math.abs(x) ? 0 : x % lst;

                d = x > 0 ? 1 : -1;
                x = d * x > lst ? d * lst : x;

                if (o.reverse) {
                    calc = fix ? function() {
                        i = d > 0 ? lst - x * (i == lst + x) : -x * (i == x); x *= -1;
                    } : function() { i -= 2 * x; x *= -1; };
                }
                else {
                    var lim = x > 0 ? lst : 1,
                        end = x < 0 ? lst : 0;
                    calc = fix ? function() { i = x > i - lim ? lst : 0; } : function() { i = end; };
                }
            }

            tis = 100 / o.display;         // set slide width/ height
            i = I = o.startSlide - 1;          // set current slide
             t.css(si.de, -tis * i + '%'); // set tape start position
             t.css(si.ze,  tis * N + '%'); // set tape size
            ti.css(si.ze,  100 / N + '%'); // set tape items sizes

            // Set time for show and animation
            wait = function() { return o.switchTime + o.showTime };

            // Return current slide index
            r.getCurrentSlide = o.infinite ? function() { return i % n + 1 } : function() { return i + 1 };

            // Set switch functions
            r.switchTo = r.setSlide = o.pager.create ? function(v) {
                setSlide(v);
                r.switchPagerTo(~~(r.getCurrentSlide() / x) + 1);
            } : setSlide;

            // Auto play
            o.autoStart ? r.play() : 0;
        }

        function togglePager(v) { console.log(v);pi.eq(v).toggleClass(o.pager.activeStyle); }

        r.switchPagerTo = function(v) {
            togglePager(~~((I + 1) / x));
            togglePager(v - 1);
            I = r.getCurrentSlide() - 1;
        };

        function setSlide(v) {
            t.stop();
            i = v - 1;
            d = (i + o.display > N) - (i < 0) ? calc() : 0;

            // movement in a certain direction
            m[si.de] = -tis * i + '%';
            // switch animation
            t.animate(m, o.switchTime, o.animation);
            // Here will be another system of animation
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
