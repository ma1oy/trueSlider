/////// Will do in the future:
//
// fix prev / next button when fix var is true
// add disable to nav buttons
// add infinite support
// add fade animation support
// add progress bar
// add scroll
// add css animation support
// add touch support
// add mouse support
// add callbacks
// add ajax
//
////// * change o.play

;+function($) {

    $.extend($.easing, {
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        }
    });

    function ceil(v) { return v > ~~v ? ~~++v : v }
    // function abs(v) { return v > 0 ? v : -v }
    // function round(v) { return v - ~~v < .5 ? ~~v : ~~++v }
    // function sign(v) { return v > 0 ? 1 : -1 }
    function _(v) { return prefix + '-' + v; }

    var prefix   = 'ss',
        defaults = {
            style:                  _('slider'),
            vertical:               false,
            infinite:               false,
            reverse:                false,
            sync:                   false,
            switchTime:             1000,
            showTime:               1000,
            animation:              'easeInOutCubic',//'easeOutBounce',//'swing',
            display:                4,
            startSlide:             6,
            autoStart:              false,

            // STEP SETTINGS
            step:                   3,
            stepAlignment:          false,
            stepAlignmentOffset:    -5,
            inRange:                true,

            // WRAPPER
            wrap:                   true,
            wrapperStyle:           _('wrapper'),
            stripeTag:             'ul',
            stripeItemTag:          'li',

        nav: {
            add:                    true,
            tag:                    'nav',
            itemTag:                'a',
            style:                  _('nav'),
            disableStyle:           '-disable',
            prevStyle:              _('prev'),
            nextStyle:              _('next'),
            prevText:               'Previous',
            nextText:               'Next'
        },

        pager: {
            add:                    true,
            tag:                    'nav',
            itemTag:                'a',
            style:                  _('pager'),
            activeStyle:            '-active',
            stretch:                true,
            vertical:               false,
            numbers:                true,
            switchMode:             2
        },

        progress: {
            add:                    true
        }
    };

    $.fn.syncSlider = function(userSettings) {

        var _t = 'top',
            _l = 'left',
            _h = 'height',
            _w = 'width',
            _ = $(this),
            r = {}, // object for return
            m = {}, // top / left movement object
            o, // all options
            w,  // tape wrapper
            t, // tape
            ti, // tape items array
            tis, // tape item size (width / height)
            nav, // nav wrapper
            ni, // navigation item
            p, // pager
            pi, // pager items array
            i, // current slide index
            I, // previous i
            j, // temporary variable
            N, // source slides number
            n, // all slides number
            x, // movement step
            X, // const of X
            ax, // abs of movement step x
            sao, // step correction offset value
            d, // forward / backward direction (1, -1)
            D, // sign of step
            f, // first possible slide index
            l, // last possible slide index
            si, // top / left and width / height style keywords (si.de, si.ze)
            fix, // fix step if necessary
            calc, // function for i calculation
            wait, // wait time for show and animation
            tout; // setTimeout function

        // If element is not exist
        if(_.length == 0) return _;

        // Support multiple elements
        if(_.length > 1) {
            _.each(function(){ $(_).syncSlider(userSettings) });
            return _;
        }

        // Initializing function
        function init() {

            // Merge user-supplied options with the defaults
            o = $.extend({}, defaults, userSettings);

            // Wrap stripe into div
            o.wrap ? (t = _) && (w = _.wrap($(document.createElement('div')).addClass(o.wrapperStyle)).parent()) :
                     (w = _) && (t = _.children(o.stripeTag));

            // Set time for show and animation
            wait = function() { return o.switchTime + o.showTime };

            o.vertical ? si = { de: _t , ze: _h } : si = { de: _l, ze: _w };    // horizontal or vertical settings
            m[si.de] = 0;                                                       // set movement side value
            ti = t.children(o.stripeItemTag);                                   // set reference to the tape items
            tis = 100 / o.display;                                              // set slide width/ height
            i = I = o.startSlide - 1;                                           // set current slide
            n = N = ti.length;                                                  // set slides count
            l = N - o.display;                                                  // last possible slide index
            x = o.step;                                                         // set movement step
            D = x > 0 ? 1 : -1;                                                 // movement direction
            ax = D * x;                                                         // absolutely step
            x = X = ax > l ? D * l : x;                                         // fix step if it more then last slide
            sao = (sao = o.stepAlignmentOffset) > 0 ? sao % x : ax + sao % x;   // step alignment offset
            fix = (fix = l % ax) || l < ax ? fix : 0;                           // fix step is necessary
            o.inRange ? f = 0 : (f = 1 - ax) && (l += fix);                     // fix step if in range

            // Add left and right navigation buttons
            if (o.nav.add) {
                nav = $(document.createElement(o.nav.tag)).addClass(o.nav.style);
                 ni = $(document.createElement(o.nav.itemTag));
                function play() { o.play ? setTimeout(function() { r.play(); }, o.switchTime) : 0; }
                nav.append(ni.clone().addClass(o.nav.prevStyle).text(o.nav.prevText).on('click',
                    function() { clt(); r.switchToPrev(); play(); }));
                nav.append(ni/*orig*/.addClass(o.nav.nextStyle).text(o.nav.nextText).on('click',
                    function() { clt(); r.switchToNext(); play(); }));
                w.append(nav);
            }

            // Add pager
            if (o.pager.add) {
                var arr = [],
                    tag = o.pager.itemTag + '>',
                    num = o.pager.numbers ? function(v) { return v + 1; } : function( ) { return '' };
                // Set array of pager items
                for (j = 0; j < ceil(l / ax) + 1; ++j) { arr.push('<' + tag + num(j) + '</' + tag); }
                // Create pager and add it to wrapper
                w.append(p = $(document.createElement(o.pager.tag)).addClass(o.pager.style).append(arr.join('')));
                // Set pager items size and add events
                j = 100 / N + '%';
                var setSize = o.pager.vertical ?
                    function(e) { $(e).css(_h, j); } :
                    function(e) { $(e).css(_w, j); };
                var addClick = function(v, e) { $(e).on('click', function() { r.switchTo(v + 1) }); };
                pi = p.children(o.pager.itemTag).each(o.pager.stretch ?
                    function(i, e) { addClick(i * ax, e); setSize(e); } :
                    function(i, e) { addClick(i * ax, e); });
                // Set active start pager item
                pi.eq(ceil((o.startSlide - 1) / ax)).addClass(o.pager.activeStyle);
                // Convert current slide index to pager item index if display > 1
                var toPager = ax < 2 ?
                    function(v) { return v } :
                    function(v) { return ceil(v / ax) };
                // Set page
                var I_ = i;
                function setPag(v) {
                    pi.eq(toPager(I_)).removeClass(o.pager.activeStyle);
                    pi.eq(v - 1).addClass(o.pager.activeStyle);
                    I_ = i;
                }
                // Return current page index
                r.getCurrentPage = function() { return toPager(i) + 1; };
                // Switching beetwin pages
                r.switchPageTo = o.pager.switchMode > 0 ?
                    function(v) { clearTimeout(j); j = setTimeout(function() {
                                  setPag(v); }, o.switchTime / o.pager.switchMode) } :
                    function(v) { setPag(v); };
                j = function(v) { setSlide(v); r.switchPageTo(r.getCurrentPage()); };
            } else j = setSlide;

            r.switchTo = j;
            r.setSlide = setSlide;
            o.stepAlignment ?
                (r.switchToPrev = function() { r.switchTo(i + 1 - (x = (X - sao + i % X) % X || X)); }) &&
                (r.switchToNext = function() { r.switchTo(i + 1 + (x = (X + sao - i % X) % X || X)); }) :
                (r.switchToPrev = function() { r.switchTo(i + 1 -  X); }) &&
                (r.switchToNext = function() { r.switchTo(i + 1 +  X); });
            // Return current slide index
            r.getCurrentSlide = o.infinite ? function() { return i % N + 1 } : function() { return i + 1 };

            if (o.infinite) {
                // Will do this in the future
                l = n - o.display;
            }
            else {
                o.reverse ?
                    calc = fix ?
                        // function() { i = d > 0 ? l - x * (i == l + x) : -x * (i == x); x *= -1; } :
                        function() {
                            // console.log(x);
                            i = d > 0 ? l - X * (i == l + X) : -X * (i == X); X *= -1;
                        } :
                        function() { i -= 2 * x; x *= -1; } :
                    calc = fix ?
                        o.inRange ?
                            function() { i = i - D * d * x < (!~d ? 1 : l) ? l : 0; } :
                            function() { i = !~d ? l : 0; } :
                        function() { i = !~d ? l : 0; };
            }

            t .css(si.de, -tis * i + '%'); // set tape start position
            t .css(si.ze,  tis * n + '%'); // set tape size
            ti.css(si.ze,  100 / n + '%'); // set tape items sizes

            // Auto play
            o.autoStart ? r.play() : 0;
        }

        function animate() {
            m[si.de] = -tis * i + '%'; // movement in a certain direction
            t.stop();
            t.animate(m, o.switchTime, o.animation); // switch animation
            // ti.eq(I).stop();
            // ti.eq(i).animate({opacity: 0}, o.switchTime, o.animation); // switch animation
            // t.css(m);
        }

        function setSlide(v) {
            I = i;
            // x = X;
            i = v - 1;

            (d = (i > l) - (i < f)) ? calc() : 0; // last / first correction
            animate();
        }

        function loop(ms) {
            tout = setTimeout(function() {
                clearTimeout(tout);
                r.switchToNext();
                loop(wait());
            }, ms);
        }

        function clt() { clearTimeout(tout); }

        r.play = function() {
            clt();
            o.play = true;
            loop(o.showTime);
        };

        r.pause = function() {
            clt();
            o.play = false;
        };

        r.stop = function() {
            r.pause();
            i = o.startSlide - 1;
            r.switchTo(i + 1);
        };

        init();
        return r;
    }
}(jQuery);
