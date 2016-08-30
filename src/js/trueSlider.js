;"use strict";+function($, document) {

    $.extend($.easing, {
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        }
    });

    const
        TOP     = 'top',
        BOTTOM  = 'bottom',
        LEFT    = 'left',
        RIGHT   = 'right',
        HEIGHT  = 'height',
        WIDTH   = 'width',
        PLAYING = 'playing',
        PAUSED  = 'paused',
        STOPPED = 'stopped';

    let sign = v => v < 0 ? -1 : 1,
        ceil= v => v > (v = ~~v) ? ++v : v,
        positive = v => v < 0 ? 0 : 1,
        negative = v => v < 0 ? 1 : 0,
        range = (v, min, max) => v < min ? min : v > max ? max : v,
        createItem = item => $(document.createElement(item.tag)).addClass(item.style),
        isFunction = functionToCheck => functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';

class TrueSlider {
    constructor(userContext, userSettings) {
        let self = this,
            settings = self.settings = Object.assign({
                namespace:                  'ts-',
                vertical:                   false, // slider orientation
                coordinateDirection:        1, // set index calculation orientation
                infinite:                   false, // emulate infinite tape
                // L if (infinite == false)
                    outOfRange:             false, // allow to go beyond the border
                    repeat:                 true, // repeat after colliding with the border
                    // L if ((outOfRange && repeat && !stepAlignment) == true)
                        startFromBorder:    false,
                    playingReverse:         true, // reverse switching when playing
                sync:                       false, // sliders synchronization
                switchTime:                 500, // switch time for animation
                showTime:                   1000, // wait time for one slide showing
                animation:                  'easeInOutCubic',//'easeOutBounce',//'swing',
                display:                    2, // numbers of slides on one screen
                startSlide:                 3, // set first slide index
                // startSlide:                 function(slidesQuantity) {
                //     return slidesQuantity; },
                autoStart:                  false, // play after plugin load
                autoStylize:                true, // add styles for components

                // STEP SETTINGS
                step:                       1,
                stepAlignment:              false,
                // L true
                    stepAlignmentOffset:    1,

                // WRAPPER
                wrapper: {
                    add:                    true,
                    tag:                    'div',
                    style:                  'wrapper'
                },

                // STRIPE
                stripe: {
                    tag:                    'ul',
                    itemTag:                'li',
                    style:                  'stripe', // stripe style class
                },

                navigation: {
                    add:                    true,
                    reverse:                false,
                    tag:                    'nav',
                    itemTag:                'a',
                    style:                  'nav',
                    disabledStyle:          '-disabled',
                    prevStyle:              'prev',
                    nextStyle:              'next',
                    prevText:               'Previous',
                    nextText:               'Next'
                },

                pagination: {
                    add:                    true,
                    tag:                    'nav',
                    itemTag:                'a',
                    style:                  'pagination',
                    activeStyle:            '-active',
                    disabledStyle:          '-disabled',
                    stretch:                true,
                    vertical:               false,
                    numbers:                function(currentPage, numberOfPages) {
                        // return currentPage;
                        return '<center>[' + currentPage + ']</center>';
                    },
                    pageLess:               true,
                    pageOffset:             -1,
                    switchDelayRatio:       1 // 0%..100%
                },

                progress: {
                    add:                    true,
                    style:                  'progress'
                },

                scroll: {
                    add:                    true,
                    style:                  'scroll'
                },

                onChange: (msg) => {},

                on: {
                    change:             () => 0,
                    beforeSwitch:       () => 0,
                    afterSwitch:        () => 0,
                    afterLastSwitch:    () => 0,
                }
            }, userSettings);

        self.addNamespaceToStyles();

        // set components ----------------------------------------------------------------------------------------------
        let $stripe  = self.stripe  = userContext,
            $wrapper = self.wrapper = (settings.wrapper.add ? $stripe.wrap(createItem(settings.wrapper)) : $stripe).parent(),
            $stripeItems = self.stripeItems = $stripe.children(settings.stripe.itemTag), // set reference to the stripe items
            calc = self.calculation = {
                style:                  [],
                firstMovementIndex:     0
            };

        // set time ----------------------------------------------------------------------------------------------------
        calc.iterationTime      = settings.switchTime + settings.showTime;
        calc.realSlidesQuantity = calc.visibleSlidesQuantity    = $stripeItems.length;
        calc.lastSlideIndex     = calc.lastMovementIndex        = calc.visibleSlidesQuantity - settings.display;

        // set orientation ---------------------------------------------------------------------------------------------
        if (settings.vertical) {
            calc.orientationSide = sign(settings.coordinateDirection) < 0 ? BOTTOM : TOP;
            calc.orientationSize = HEIGHT;
        } else {
            calc.orientationSide = sign(settings.coordinateDirection) < 0 ? RIGHT : LEFT;
            calc.orientationSize = WIDTH;
        }
        // calc.movementObject     = { [calc.orientationSide]: 0 }; // set movement side value

        // set step ----------------------------------------------------------------------------------------------------
        calc.step               = settings.step; // set movement step
        calc.signOfStep         = calc.repeatMovementDirection = sign(calc.step); // movement direction
        calc.absolutelyStep     = calc.signOfStep * calc.step; // absolutely step
        if (calc.absolutelyStep > calc.lastMovementIndex) { // fix movement step if it too big
            calc.step = calc.signOfStep * calc.lastMovementIndex;
        }
        calc.currentStep        = calc.step;

        // set start slide ---------------------------------------------------------------------------------------------
        if (isFunction(settings.startSlide)) {
            settings.startSlide = settings.startSlide(calc.visibleSlidesQuantity);
        }
        calc.currentSlideIndex = calc.previousSlideIndex = settings.startSlide - 1;

        // set components sizes ----------------------------------------------------------------------------------------
        calc.stripeItemSize = 100 / settings.display; // set slide width / height
        calc.stripeSize = calc.stripeItemSize * calc.realSlidesQuantity;
        self.addStyle(settings.stripe.style, {[calc.orientationSize]: calc.stripeSize + '%'});
        self.addStyle(settings.stripe.style + '>' + settings.stripe.itemTag,
            {[calc.orientationSize]: 100 / calc.realSlidesQuantity + '%'});

        // set components positions ------------------------------------------------------------------------------------
        // self.setSlide(settings.startSlide);
        $stripe.css(calc.orientationSide, (settings.coordinateDirection < 0) * calc.stripeSize -
            calc.stripeItemSize * calc.currentSlideIndex + '%'); // set stripe start position

        // step alignment and page numbers -----------------------------------------------------------------------------
        calc.pageNumbers = calc.lastSlideIndex;
        if (settings.stepAlignment) {
            calc.stepAlignmentOffset = settings.stepAlignmentOffset;
            calc.stepAlignmentOffset = calc.stepAlignmentOffset < 0 ?
                calc.stepAlignmentOffset % calc.step + calc.absolutelyStep :
                calc.stepAlignmentOffset % calc.step;

            calc.pageNumbers += calc.absolutelyStep - calc.stepAlignmentOffset;
            calc.paginationPageOffset = calc.stepAlignmentOffset - calc.absolutelyStep * !!calc.stepAlignmentOffset + 1;

            // calc.fixFirstMovement = calc.step - calc.stepAlignmentOffset;
            // calc.fixLastMovement  = calc.step + calc.stepAlignmentOffset;
            self.getFutureSlideIndex = (direction = 1) => calc.currentSlideIndex + 1 + direction * (calc.currentStep =
                (calc.step + direction * (calc.stepAlignmentOffset - calc.currentSlideIndex % calc.step))
                % calc.step || calc.step);
        } else {
            calc.stepAlignmentOffset = 0;
            calc.paginationPageOffset = 1;
            self.getFutureSlideIndex = (direction = 1) => calc.currentSlideIndex + 1 + direction * calc.step;
        }
        calc.pageNumbers = ceil(calc.pageNumbers / calc.absolutelyStep) + 1; //!!!!!!!! 1 no
        self.switchInDirection = direction => { self.switchTo(self.getFutureSlideIndex(direction)); };
        self.switchForward  = () => { self.switchInDirection( 1); };
        self.switchBackward = () => { self.switchInDirection(-1); };

        // infinite ----------------------------------------------------------------------------------------------------
        if (settings.infinite) {
            // Will do this in the future
            // l = n - settings.display;
        }
        else {
            // set first and last movement index
            if (settings.outOfRange) {
                calc.absolutelyStep < settings.display ?
                    self.wideMovementRange(calc.absolutelyStep) :
                    self.wideMovementRange(settings.display);
            }
            let correctIndex = settings.repeat ?
                // repeat
                calc.absolutelyStep < 2 ?
                    () => { calc.currentSlideIndex = self.backwardOrForward(calc.lastSlideIndex, 0) } :
                    // settings.outOfRange ? k.iCalcOrr() : function() { i = i - D * d * x < b(L, 1) ? L : 0; } :
                    settings.outOfRange ?
                        () => null :
                        () => null :
                // don't repeat
                settings.outOfRange ?
                    () => { calc.currentSlideIndex +=
                        self.backwardOrForward(calc.currentStep, -calc.currentStep); } :
                    () => { calc.currentSlideIndex =
                        self.backwardOrForward(0, calc.lastSlideIndex); };

            self.switchTo = (slide) => self.setSlideWithCorrection(slide, correctIndex);
            if (settings.playingReverse) {
                let setNextPrevSwitches = (a, b) => { self.switchToNext = b; self.switchToPrev = a; };
                self.switchInDirectionReverse = (direction) => {
                    self.setSlideWithCorrection(self.getFutureSlideIndex(direction), () => {
                        correctIndex();
                        // if (calc.currentSlideIndex === calc.firstMovementIndex) {
                        // // if (calc.currentSlideIndex === calc.firstMovementIndex ||
                        // //     calc.currentSlideIndex === calc.lastMovementIndex) {
                        //     calc.currentSlideIndex -= direction * calc.currentStep;
                        // }
                        setNextPrevSwitches(self.switchToNext, self.switchToPrev);
                    });
                };
                self.switchToNext = () => { self.switchInDirectionReverse( 1); };
                self.switchToPrev = () => { self.switchInDirectionReverse(-1); };
            } else {
                self.switchToNext = self.switchForward;
                self.switchToPrev = self.switchBackward;
            }
        }

        // add navigation ----------------------------------------------------------------------------------------------
        if (settings.navigation.add) {
            self.navigate();
        }

        // add pagination ----------------------------------------------------------------------------------------------
        if (settings.pagination.add) {
            self.paginate();
        }

        // apply style -------------------------------------------------------------------------------------------------
        if (settings.autoStylize) {
            $wrapper.prepend(self.style = document.createElement('style'));
            self.stylize();
        }

        // auto play
        if (settings.autoStart && calc.absolutelyStep) {
            self.play();
        } else {
            calc.state = STOPPED;
            settings.onChange(calc); //! remove
        }
    }

    addNamespace(value) {
        return this.settings.namespace + value;
    }

    addNamespaceToStyles() {
        let settings = this.settings;
        [settings.wrapper, settings.stripe, settings.navigation, settings.pagination, settings.progress, settings.scroll]
            .forEach(item => { item.style = this.addNamespace(item.style); return item; });
        let addNamespaceToAdditionalStyles = (item, names) => {
            names.forEach(name => {
                item[name + 'Style'] = this.addNamespace(item[name + 'Style']);
            });
        };
        addNamespaceToAdditionalStyles(settings.navigation, ['disabled', 'prev', 'next']);
        addNamespaceToAdditionalStyles(settings.pagination, ['disabled', 'active']);
    }

    addStyle(selector, body) {
        let calc = this.calculation;
        for (let item of calc.style) {
            if (item.selector === selector) {
                Object.assign(item.body, body);
                return;
            }
        }
        calc.style.push({
            selector: selector,
            body: body
        });
    }

    stylize() {
        let self = this,
            calc = self.calculation;
        self.style.innerText = '';
        for (let item of calc.style) {
            self.style.innerText += '.' + item.selector + '{';
            for (let key in item.body) {
                if (item.body.hasOwnProperty(key)) {
                    self.style.innerText += key + ':' + item.body[key] + ';';
                }
            }
            self.style.innerText += '}';
        }
    }

    wrap() {
        let self = this;
        self.wrapper = self.stripe.wrap(createItem(self.settings.wrapper)).parent();
        return self;
    }

    navigate() {
        let self = this,
            calc = self.calculation,
            settings = self.settings;
        // Add left and right navigation buttons
        self.navigation = createItem(settings.navigation);
        let navigationItem = $(document.createElement(settings.navigation.itemTag));
        function play() {
            calc.state === PLAYING ? calc.timeoutId = setTimeout(function() {
                self.play();
            }, settings.switchTime) : 0;
        }
        self.navigation.append(navigationItem.clone().addClass(settings.navigation.prevStyle)
            .text(settings.navigation.prevText).on('click', () => {
                self.stopCycle();
                // self.switchToPrev();
                self.switchBackward();
                play();
            }));
        self.navigation.append(navigationItem/*orig*/.addClass(settings.navigation.nextStyle)
            .text(settings.navigation.nextText).on('click', () => {
                self.stopCycle();
                // self.switchToNext();
                self.switchForward();
                play();
            }));
        self.wrapper.append(self.navigation);
    }

    paginate() {
        let self = this,
            settings = self.settings,
            calc = self.calculation,
            items = [],
            tag = settings.pagination.itemTag + '>',
            numberToPrint = settings.pagination.numbers ? settings.pagination.numbers : () => '';
        for (let i = 0; i < calc.pageNumbers; ++i) {
            items.push('<' + tag + numberToPrint(i + 1, calc.pageNumbers) + '</' + tag);
        }
        self.wrapper.append(self.pagination = createItem(settings.pagination).append(items.join('')));
        calc.paginationItemSize = 100 / calc.visibleSlidesQuantity;
        if (settings.pagination.stretch) {
            self.addStyle(settings.pagination.style + '>' + settings.pagination.itemTag,
                {[calc.orientationSize]: calc.paginationItemSize + '%'});
        }
        self.switchPageTo = page => self.switchTo(page * calc.absolutelyStep + calc.paginationPageOffset);
        self.pagination.children(settings.pagination.itemTag).each((page, item) => {
            $(item).on('click', () => {
                self.switchPageTo(page);
            });
        });
    }

    progress() {
        // add progress
    }

    scroll() {
        // add scrooll
    }

    setSlideWithCorrection(slideNumber, outOfRangeCorrection) {
        let self = this,
            settings = self.settings,
            calc = self.calculation;
        calc.previousSlideIndex = calc.currentSlideIndex;
        calc.currentSlideIndex = slideNumber - 1;
        if (calc.repeatMovementDirection = (calc.currentSlideIndex + 0 > calc.lastMovementIndex) -
                                           (calc.currentSlideIndex - 0 < calc.firstMovementIndex)) {
            outOfRangeCorrection(); // last / first correction
        }
        settings.onChange(calc);
        // self.stripeItems.eq(calc.previousSlideIndex).css({ position: 'absolute', left: 100 / n * I + '%' });
        // self.stripe.css({ [calc.orientationSide]: -calc.stripeItemSize * calc.currentSlideIndex + '%' });
        self.stripe.animate({ [calc.orientationSide]: -calc.stripeItemSize * calc.currentSlideIndex + '%' },
            settings.switchTime, settings.animation);
    }

    currentSlide() {
        return this.calculation.currentSlideIndex;
    }

    backwardOrForward(backward, forward) {
        return this.calculation.repeatMovementDirection < 0 ? backward : forward;
    }

    wideMovementRange(correction) {
        let calc = this.calculation;
        calc.firstMovementIndex -= correction - 1;
        calc.lastMovementIndex  += correction - 1;
    }

    startCycle(ms) {
        let self = this,
            calc = self.calculation;
        calc.timeoutId = setTimeout(function() {
            self.stopCycle();
            self.switchToNext();
            self.startCycle(calc.iterationTime);
        }, ms);
    }

    stopCycle() {
        clearTimeout(this.calculation.timeoutId);
    }

    changeStateTo(state) {
        this.calculation.state = state;
        this.stopCycle();
    }

    play() {
        let self = this;
        self.changeStateTo(PLAYING);
        self.startCycle(self.settings.showTime);
    }

    pause() {
        this.changeStateTo(PAUSED);
    }

    stop() {
        let self = this;
        self.changeStateTo(STOPPED);
        self.switchTo((self.calculation.currentSlideIndex = self.settings.startSlide - 1) + 1);
    }
}

$.fn.trueSlider = function(userSettings) {
    let $this = $(this);
    // If element is not exist
    if($this.length == 0) return this;
    // Support multiple elements
    if($this.length > 1) {
        $this.each(function(){ $this.syncSlider(userSettings) });
        return $this;
    }
    return new TrueSlider($this, userSettings);
};

}(jQuery, document);
