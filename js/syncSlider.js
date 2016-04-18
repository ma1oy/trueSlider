/////// Will do in the future:
//
// fix reverse with step alignment
// add disable to nav buttons
// add infinite support
// add fade animation support
// add css animation support
// add progress bar
// add touch support
// add mouse support
// add callbacks
// add scroll
// add template / ajax
//
////// * change o.play

// Выравнивание по stepAlignment, а если false то по краях и пофиксить reverse

;+function($) {

    $.extend($.easing, {
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        }
    });

    // function ceil(v) { return v > ~~v ? ~~++v : v }
    function ceil(v) { return v > (v = ~~v) ? ++v : v }
    function abs(v) { return v > 0 ? v : -v }
    function round(v) { return v - ~~v < .5 ? ~~v : ~~++v }
    function sign(v) { return v > 0 ? 1 : -1 }
    function _(v) { return prefix + '-' + v; }

    var prefix   = 'ss',
        defaults = {
            style:                      _('slider'), // tape style class
            vertical:                   false, // slider orientation
            infinite:                   false, // emulate infinite tape
            // L false
                outOfRange:             true, // allow to go beyond the border
                repeat:                 true, // repeat after colliding with the border
                // L if (outOfRange && repeat && !stepAlignment)
                    startFromBorder:    false,
                playingReverse:         true, // reverse switching when playing
            sync:                       false, // sliders synchronization
            coordinateDirection:        1, // set index calculation orientation
            switchTime:                 1000, // switch time for animation
            showTime:                   1000, // wait time for one slide showing
            animation:                  'easeInOutCubic',//'easeOutBounce',//'swing',
            display:                    4, // numbers of slides on one screen
            startSlide:                 3, // set first slide index
            autoStart:                  false, // play after plugin load

            // STEP SETTINGS
            step:                       1,
            stepAlignment:              true,
            // L true
                stepAlignmentOffset:    1,

            // WRAPPER
            wrap:                       true,
            wrapperStyle:               _('wrapper'),
            stripeTag:                  'ul',
            stripeItemTag:              'li',

        navigation: {
            add:                        true,
            reverse:                    false,
            tag:                        'nav',
            itemTag:                    'a',
            style:                      _('nav'),
            disableStyle:               '-disable',
            prevStyle:                  _('prev'),
            nextStyle:                  _('next'),
            prevText:                   'Previous',
            nextText:                   'Next'
        },

        pagination: {
            add:                        true,
            tag:                        'nav',
            itemTag:                    'a',
            style:                      _('pagination'),
            activeStyle:                '-active',
            stretch:                    true,
            vertical:                   false,
            numbers:                    true,
            numbersCallback:            function(currentPage, numberOfPages, options) {
                // var j = i * o.step - o.step + 1;
                // return j + '..' + (j + o.display - 1) + '|';
                return currentPage;
            },
            pageLess:                   true,
            pageOffset:                 -1,
            switchMode:                 2
        },

        progress: {
            add:                        true
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
            pn, // page numbers
            pi, // pager items array
            i, // current slide index
            I, // previous i
            j, // temporary variable
            N, // source slides number
            n, // all slides number
            x, // movement step
            X, // const of X
            ax, // abs of movement step x
            shs, // if last slides had shown
            sao, // step correction offset value
            ppo,
            d, // forward / backward direction (1, -1)
            D, // sign of step
            f, // first possible slide index
            l, // last possible slide index
            L,
            si, // top / left and width / height style keywords (si.de, si.ze)
            fix, // fix step if necessary
            next, // contain reference to the function of next switching
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
            l = L = N - o.display;                                                  // last possible slide index
            x = o.step;                                                         // set movement step
            D = x > 0 ? 1 : -1;                                                 // movement direction
            ax = D * x;                                                         // absolutely step
            x = X = ax > L ? D * L : x;                                         // fix step if it more then last slide
            sao = (sao = o.stepAlignmentOffset) >= 0 ? sao % x : ax + sao % x;   // step alignment offset
            shs = (X - sao == o.display % X);
            ppo = o.pagination.pageOffset % X;
            //fix = (fix = l % ax) || l < ax ? fix : 0;                           // fix step is necessary
            // o.outOfRange ? (f = 1 - X) && (l = N - X) : f = 0;                  // fix step if in range
            // o.outOfRange ? (f = 1 - X) && (l = N - 1 + (X < o.display) * (X - o.display)) : f = 0;
            // o.outOfRange ? (f = 1 - o.display) && (l = X < o.display ? l + X - 1 : N - 1) : f = 0;

            o.outOfRange ? X < o.display ? (f = 1 - X        ) && (l = L + X - 1) :
                                           (f = 1 - o.display) && (l =     N - 1) : f = 0;

            // Add left and right navigation buttons
            if (o.navigation.add) {
                nav = $(document.createElement(o.navigation.tag)).addClass(o.navigation.style);
                 ni = $(document.createElement(o.navigation.itemTag));
                function play() { r.isPlaying ? setTimeout(function() { r.play(); }, o.switchTime) : 0; }
                nav.append(ni.clone().addClass(o.navigation.prevStyle).text(o.navigation.prevText).on('click',
                    function() { clt(); r.switchToPrev(); play(); }));
                nav.append(ni/*orig*/.addClass(o.navigation.nextStyle).text(o.navigation.nextText).on('click',
                    function() { clt(); r.switchToNext(); play(); }));
                w.append(nav);
            }

            // Add pager
            if (o.pagination.add) {
                var arr = [],
                    tag = o.pagination.itemTag + '>',
                    // num = o.pager.numbers ? function(v) { return v + 1; } : function( ) { return '' },
                    inn = o.pagination.numbersCallback ? o.pagination.numbersCallback : function( ) { return '' };
                // Set array of pager items
                var k = ceil(l / ax) + 1 - 0 - shs;
                for (j = 0; j < k; ++j) { arr.push('<' + tag + inn(j + 1, k, o) + '</' + tag); }
                // Create pager and add it to wrapper
                w.append(p = $(document.createElement(o.pagination.tag)).addClass(o.pagination.style).append(arr.join('')));
                // Set pager items size and add events
                j = 100 / N + '%';
                var setSize = o.pagination.vertical ?
                    function(e) { $(e).css(_h, j); } :
                    function(e) { $(e).css(_w, j); };
                var addClick = function(v, e) { $(e).on('click', function() { r.switchTo(v + 1) }); };
                pi = p.children(o.pagination.itemTag).each(o.pagination.stretch ?
                    function(i, e) { addClick(i * ax, e); setSize(e); } :
                    function(i, e) { addClick(i * ax, e); });
                // Set active start pager item
                pi.eq(ceil((o.startSlide - 1) / ax)).addClass(o.pagination.activeStyle);
                // Convert current slide index to pager item index if display > 1
                var toPager = ax < 2 ?
                    function(v) { return v } :
                    function(v) { return ceil(v / ax) }; //!!!!!!!!!!!!!!!
                // Set page
                var I_ = i;
                function setPag(v) {
                    pi.eq(toPager(I_)).removeClass(o.pagination.activeStyle);
                    pi.eq(v - 1).addClass(o.pagination.activeStyle);
                    I_ = i;
                }
                // Return current page index
                r.getCurrentPage = function() { return toPager(i) + 1; };
                // Switching beetwin pages
                r.switchPageTo = o.pagination.switchMode > 0 ?
                    function(v) { clearTimeout(j); j = setTimeout(function() {
                                  setPag(v); }, o.switchTime / o.pagination.switchMode) } :
                    function(v) { setPag(v); };
                j = function(v) { setSlide(v); r.switchPageTo(r.getCurrentPage()); };
            } else j = setSlide;

            r.switchTo = j;
            r.setSlide = setSlide;
            o.stepAlignment ?
                (r.switchToPrev = function() { r.switchTo(i + 1 - (x = (X - sao + i % X) % X || X)); }) &&
                (r.switchToNext = function() { r.switchTo(i + 1 + (x = (X + sao - i % X) % X || X)); }) :
                (r.switchToPrev = function() { r.switchTo(i + 1 -  x); }) &&
                (r.switchToNext = function() { r.switchTo(i + 1 +  x); });
            next = r.switchToNext;
            // Return current slide index
            r.getCurrentSlide = o.infinite ? function() { return i % N + 1 } : function() { return i + 1 };

            if (o.infinite) {
                // Will do this in the future
                l = n - o.display;
            }
            else {
                var b = function(a, b) { return d > 0 ? a : b };
                var jump = o.repeat ?
                    ax > 1 ?
                        o.outOfRange ?
                            o.stepAlignment ?
                                function() { i = b((sao - x) % x, N + sao - x - x * shs) } : // FIX!!!
                                o.startFromBorder ?
                                    function() { i = b(0, L) } :
                                    function() { i = b((i % x - x) % x, N + i % x - x) } :
                            function() { i = i - D * d * x < b(L, 1) ? L : 0; } :
                        function() { i = b(0, L) } :
                    o.outOfRange ?
                        function() { i += b(-x, x) } :
                        function() { i = b(L, 0) };

                // Navigation reverse
                // i == (d > 0 ? l : f) + d * X ? (i -= 2 * d * X) && (x *= -1) : i = d > 0 ? l : 0;

                calc = o.playingReverse ? function() { next = d > 0 ? r.switchToPrev : r.switchToNext; jump() } : jump;
            }

            t .css(si.de, -tis * i + '%'); // set tape start position
            t .css(si.ze,  tis * n + '%'); // set tape size
            ti.css(si.ze,  100 / n + '%'); // set tape items sizes

            // Auto play
            o.autoStart && X ? r.play() : 0;
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
            // I = i;
            // x = X;
            i = v - 1;

            // j = i - x + o.display;
            // (d = (i > l + x - 1) - (i < 1 - x)) ? calc() : 0;
            (d = (i > l) - (i < f)) ? calc() : 0; // last / first correction
            animate();
        }

        function loop(ms) {
            tout = setTimeout(function() {
                clearTimeout(tout);
                // r.switchToNext();
                next();
                loop(wait());
            }, ms);
        }

        function clt() { clearTimeout(tout); }

        r.play = function() {
            clt();
            r.isPlaying = true;
            r.isPaused = false;
            loop(o.showTime);
        };

        r.pause = function() {
            clt();
            r.isPlaying = false;
            r.isPaused = true;
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
