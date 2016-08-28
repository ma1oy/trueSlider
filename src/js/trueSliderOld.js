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

    function position(el) {
        var a = el.getBoundingClientRect(),
            b = el.parentNode.getBoundingClientRect();
        return {
            pageX: a.left - b.left,
            pageY: a.top  - b.top
        }
    }

    // function ceil(v) { return v > ~~v ? ~~++v : v }
    function ceil(v) { return v > (v = ~~v) ? ++v : v }
    function floor(v) { return ~~v }
    function abs(v) { return v < 0 ? -v : v }
    function round(v) { return v - ~~v < .5 ? ~~v : ~~++v }
    function sign(v) { return v > 0 ? 1 : -1 }
    function trunc(x) { return x < 0 ? ceil(x) : floor(x) }
    
    function _(v) { return prefix + '-' + v; }

    var prefix   = 'ss',
        defaults = {
            style:                      _('slider'), // tape style class
            vertical:                   false, // slider orientation
            infinite:                   false, // emulate infinite tape
            // L if (infinite == false)
                outOfRange:             false, // allow to go beyond the border
                repeat:                 false, // repeat after colliding with the border
                // L if ((outOfRange && repeat && !stepAlignment) == true)
                    startFromBorder:    false,
                playingReverse:         true, // reverse switching when playing
            sync:                       false, // sliders synchronization
            coordinateDirection:        1, // set index calculation orientation
            switchTime:                 500, // switch time for animation
            showTime:                   1000, // wait time for one slide showing
            animation:                  'easeInOutCubic',//'easeOutBounce',//'swing',
            display:                    1, // numbers of slides on one screen
            startSlide:                 3, // set first slide index
            autoStart:                  false, // play after plugin load

            // STEP SETTINGS
            step:                       1,
            stepAlignment:              false,
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
            k = {},
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

            // Step alignment
            var b = function(a, b) { return d > 0 ? a : b };
            if (o.stepAlignment) {
                var sao = o.stepAlignmentOffset;
                sao = sao > 0 ? sao % x : ax + sao % x; // step alignment offset
                pn = L + ax - sao; // display > step
                var shs = (X - sao == o.display % X), // if last slides had shown
                    ppo = sao - ax * !!sao + 1,
                    fxf = x - sao,
                    fxl = x + sao;
                k.iCalcOrr = function() { i = b((sao - x) % x, N + sao - x - x * shs) };
                k.addPageClick = function(v, e) { v += ppo; $(e).on('click', function() { r.switchTo(v) }); };
                r.switchToPrev = function() { r.switchTo(i + 1 - (x = (fxf + i % X) % X || X)); };
                r.switchToNext = function() { r.switchTo(i + 1 + (x = (fxl - i % X) % X || X)); }
            }
            else {
                pn = L;
                k.iCalcOrr = o.startFromBorder ?
                    function() { i = b(0, L) } :
                    function() { i = b((i % x - x) % x, N + i % x - x) };
                k.addPageClick = function(v, e) { v += 1;   $(e).on('click', function() { r.switchTo(v) }); };
                r.switchToPrev = function() { r.switchTo(i + 1 -  x); };
                r.switchToNext = function() { r.switchTo(i + 1 +  x); }
            }
            pn = ceil(pn / ax) + 1;
            next = r.switchToNext;

            // Repeat and outOfRange
            k.iCalc = o.repeat ?
                ax < 2 ? function() { i = b(0, L) } :
                    o.outOfRange ? k.iCalcOrr() : function() { i = i - D * d * x < b(L, 1) ? L : 0; } :
                o.outOfRange ? function() { i += b(-x, x) } : function() { i = b(L, 0) };

            // Add pager
            if (o.pagination.add) {
                var arr = [],
                    tag = o.pagination.itemTag + '>',
                    // num = o.pager.numbers ? function(v) { return v + 1; } : function( ) { return '' },
                    inn = o.pagination.numbersCallback ? o.pagination.numbersCallback : function( ) { return '' };
                // Set array of pager items
                // var k = ceil(l / ax) + 1 - shs;
                for (j = 0; j < pn; ++j) { arr.push('<' + tag + inn(j + 1, pn, o) + '</' + tag); }
                // Create pager and add it to wrapper
                w.append(p = $(document.createElement(o.pagination.tag)).addClass(o.pagination.style).append(arr.join('')));
                // Set pager items size and add events
                j = 100 / N + '%';
                var setSize = o.pagination.vertical ?
                    function(e) { $(e).css(_h, j); } :
                    function(e) { $(e).css(_w, j); };
                pi = p.children(o.pagination.itemTag).each(o.pagination.stretch ?
                    function(i, e) { k.addPageClick(i * ax, e); setSize(e); } :
                    function(i, e) { k.addPageClick(i * ax, e); });
                var test = ~~(o.display / 2) - 1;
                // Set active start pager item
                pi.eq(ceil((o.startSlide - test - 1) / ax)).addClass(o.pagination.activeStyle);
                // Convert current slide index to pager item index if display > 1
                var toPager = ax < 2 ?
                    function(v) { return v } :
                    function(v) { return ceil((v) / ax) }; //!!!!!!!!!!!!!!!
                // Set page
                var I_ = i;
                function setPage(v) {
                    pi.eq(toPager(I_ - test)).removeClass(o.pagination.activeStyle);
                    pi.eq(v - 1).addClass(o.pagination.activeStyle);
                    I_ = i;
                }
                // Return current page index
                r.getCurrentPage = function() { return toPager(i - test) + 1; };
                // Switching beetwin pages
                r.switchPageTo = o.pagination.switchMode > 0 ?
                    function(v) { clearTimeout(j); j = setTimeout(function() {
                                  setPage(v); }, o.switchTime / o.pagination.switchMode) } :
                    function(v) { setPage(v); };
                r.switchTo = function(v) { setSlide(v); r.switchPageTo(r.getCurrentPage()); };
            }
            else r.switchTo = setSlide;
            r.setSlide = setSlide;

            // Return current slide index
            r.getCurrentSlide = o.infinite ? function() { return i % N + 1 } : function() { return i + 1 };

            if (o.infinite) {
                // Will do this in the future
                l = n - o.display;
            }
            else {
                var jump = o.repeat ?
                    ax < 2 ? function() { i = b(0, L) } :
                        o.outOfRange ? k.iCalcOrr() : function() { i = i - D * d * x < b(L, 1) ? L : 0; } :
                    o.outOfRange ? function() { i += b(-x, x) } : function() { i = b(L, 0) };

                // Navigation reverse
                // i == (d > 0 ? l : f) + d * X ? (i -= 2 * d * X) && (x *= -1) : i = d > 0 ? l : 0;

                calc = o.playingReverse ? function() { next = d > 0 ? r.switchToPrev : r.switchToNext; jump() } : jump;
            }

            t .css(si.de, -tis * i + '%'); // set tape start position
            t .css(si.ze,  tis * n + '%'); // set tape size
            ti.css(si.ze,  100 / n + '%'); // set tape items sizes

            var touchStart = 0;
            var tapeStart = 0;
            function handleStart(e) {
                e.preventDefault();
                touchStart = e.changedTouches[0].pageX;
                tapeStart = position(t.get(0)).pageX;
                // console.log('touchStart: ' + touchStart + ' : ' + 'tapeStart: ' + tapeStart);
            }
            function handleMove(e) {
                e.preventDefault();
                // console.log(e.touches[0].pageX);
                // console.log(position(t.get(0)).pageX);
                var pos = tapeStart + e.touches[0].pageX - touchStart;
                t.css(si.de, pos);
                // console.log(position(t.get(0)).pageX);
                // console.log(~~(position(t.get(0)).pageX / ti.width()));
            }
            function handleEnd(e) {
                e.preventDefault();
                r.switchTo(round(-position(t.get(0)).pageX / ti.width()) + 1);
            }
            t.get(0).addEventListener("touchstart", handleStart, false);
            t.get(0).addEventListener("touchmove", handleMove, false);
            t.get(0).addEventListener("touchend", handleEnd, false);

            // Auto play
            o.autoStart && X ? r.play() : 0;
        }

        var II = 0;
        function animate() {
            // m[si.de] = -tis * i + '%'; // movement in a certain direction
            // t.stop();
            // t.animate(m, o.switchTime, o.animation); // switch animation

            // ti.eq(I).stop();
            m[si.de] = -tis * (I) + '%';
            ti.eq(II).css({ position: 'relative', left: 'auto', opacity: 1 });
            ti.eq(I).css({ background: '#fff', position: 'absolute', left: 100 / n * I + '%' });
            ti.eq(I).animate({opacity: 0}, o.switchTime, o.animation); // switch animation
            t.css(m);
            II = I;
        }

        function setSlide(v) {
            I = i;
            // x = X;
            i = v - 1;

            // j = i - x + o.display;
            // (d = (i > l + x - 1) - (i < 1 - x)) ? calc() : 0;
            (d = (i > l) - (i < f)) ? calc() : 0; // last / first correction
            animate();
        }

        function loop(ms) {
            tout = setTimeout(function() {
                clt();
                // r.switchToNext();
                next();
                loop(wait());
            }, ms);
        }

        function clt() {
            clearTimeout(tout);
        }

        function state(v) {
            r.isPlaying = r.isStoped = r.isPaused = false;
            v = true;
            clt();
        }

        r.play  = function() { state(r.isPlaying); loop(o.showTime); };
        r.pause = function() { state(r.isPaused ); };
        r.stop  = function() { state(r.isStoped ); r.switchTo((i = o.startSlide - 1) + 1); };

        init();
        return r;
    }
}(jQuery);
