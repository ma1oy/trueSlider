;"use strict";+function($, document) {

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
        createItem = item => $(document.createElement(item.tag)).addClass(item.style),
        isFunction = functionToCheck => functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';

class TrueSlider {
    constructor(userContext, userSettings) {
        let self = this,
            settings = self.settings = Object.assign({
                namespace:                  'ts-',
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
                // startSlide:                 function(slidesQuantity, settings) {
                //     return slidesQuantity; },
                autoStart:                  false, // play after plugin load

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
                    numbers:                function(currentPage, numberOfPages, settings) {
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
                }
            }, userSettings);
        self.addNamespaceToStyles();
        let $stripe  = self.stripe  = userContext,
            $wrapper = self.wrapper = (settings.wrapper.add ? $stripe.wrap(createItem(settings.wrapper)) : $stripe).parent(),
            $stripeItems = $stripe.children(settings.stripe.itemTag), // set reference to the stripe items
            calc = self.calculation = {
                style:                  [],
                iterationTime:          settings.switchTime + settings.showTime,
                stripeItemSize:         100 / settings.display, // set slide width / height
                visibleSlidesQuantity:  $stripeItems.length // set slides count
            };
        if (settings.vertical) {
            calc.orientationSide = sign(settings.coordinateDirection) < 0 ? BOTTOM : TOP;
            calc.orientationSize = HEIGHT;
        } else {
            calc.orientationSide = sign(settings.coordinateDirection) < 0 ? RIGHT : LEFT;
            calc.orientationSize = WIDTH;
        }
        calc.movementObject     = { [calc.orientationSide]: 0 }; // set movement side value
        calc.realSlidesQuantity = calc.visibleSlidesQuantity;
        calc.lastSlideIndex     = calc.visibleSlidesQuantity - settings.display; // last possible slide index

        // set step
        calc.step               = settings.step; // set movement step
        calc.signOfStep         = calc.repeatMovementDirection = sign(calc.step); // movement direction
        calc.absolutelyStep     = calc.signOfStep * calc.step; // absolutely step
        if (calc.absolutelyStep > calc.lastMovementIndex) { // fix movement step if it too big
            calc.step = calc.signOfStep * calc.lastMovementIndex;
        }
        calc.currentStep        = calc.step;

        // set start slide
        if (isFunction(settings.startSlide)) {
            settings.startSlide = settings.startSlide(calc.visibleSlidesQuantity, settings);
        }
        calc.currentSlideIndex = calc.previousSlideIndex = settings.startSlide - 1;

        // set first and last movement index
        if (settings.outOfRange) {
            calc.firstMovementIndex = 1;
            if (calc.absolutelyStep < settings.display) {
                calc.firstMovementIndex -= calc.absolutelyStep;
                calc.lastMovementIndex   = calc.lastSlideIndex + calc.absolutelyStep;
            } else {
                calc.firstMovementIndex -= settings.display;
                calc.lastMovementIndex   = calc.visibleSlidesQuantity;
            }
            --calc.lastMovementIndex;
        } else {
            calc.firstMovementIndex = 0; // first slide index in movement
            calc.lastMovementIndex  = calc.lastSlideIndex; // last slide index in movement
        }

        // set dom elements sizes
        calc.stripeSize = calc.stripeItemSize * calc.realSlidesQuantity;
        $stripe.css(calc.orientationSide, negative(settings.coordinateDirection) * calc.stripeSize -
            calc.stripeItemSize * calc.currentSlideIndex + '%'); // set stripe start position
        // $stripe.css(calc.orientationSize, calc.stripeSize + '%'); // set stripe size
        // $stripeItems.css(calc.orientationSize,  100 / calc.realSlidesQuantity + '%'); // set stripe items sizes
        // calc.style += createCss(settings.stripe.style, [calc.orientationSize], [calc.stripeSize + '%']);
        // calc.style += createCss(settings.stripe.style + '>' + settings.stripe.itemTag,
        //     [calc.orientationSize], [100 / calc.realSlidesQuantity + '%']);
        self.addStyle(settings.stripe.style, {[calc.orientationSize]: calc.stripeSize + '%'});
        self.addStyle(settings.stripe.style + '>' + settings.stripe.itemTag,
            {[calc.orientationSize]: 100 / calc.realSlidesQuantity + '%'});

        // step alignment and page numbers
        if (settings.stepAlignment) {
            calc.stepAlignmentOffset = settings.stepAlignmentOffset;
            calc.stepAlignmentOffset = calc.stepAlignmentOffset < 0 ?
                calc.stepAlignmentOffset % calc.currentStep + calc.absolutelyStep : // step alignment offset
                calc.stepAlignmentOffset % calc.currentStep;
        } else {
            calc.stepAlignmentOffset = 0;
        }

        // add pagination
        if (settings.pagination.add) {
            self.paginate();
        }

        // apply style
        // $wrapper.prepend('<style>' + calc.style + '</style>');
        self.style = document.createElement('style');
        $wrapper.prepend(self.style);
        self.updateStyle();

        // auto play
        if (settings.autoStart && calc.absolutelyStep) {
            self.play();
        } else {
            calc.state = STOPPED;
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

    updateStyle() {
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

    paginate() {
        let self = this,
            settings = self.settings,
            calc = self.calculation,
            items = [],
            tag = settings.pagination.itemTag + '>',
            numberToPrint = settings.pagination.numbers ? settings.pagination.numbers : () => '';
        calc.pageNumbers = calc.lastSlideIndex;
        // if (settings.stepAlignment) {
        //     calc.pageNumbers += calc.absolutelyStep - calc.stepAlignmentOffset;
        // }
        // calc.pageNumbers = ceil(calc.pageNumbers / calc.absolutelyStep);// + 1;
        calc.pageNumbers = ceil((calc.lastSlideIndex + !!settings.stepAlignment *
                (calc.absolutelyStep - calc.stepAlignmentOffset)) / calc.absolutelyStep) + 1;
        for (let i = 0; i < calc.pageNumbers; ++i) {
            items.push('<' + tag + numberToPrint(i + 1, calc.pageNumbers, settings) + '</' + tag);
        }
        self.wrapper.append(self.pagination = createItem(settings.pagination).append(items.join('')));
        calc.paginationItemSize = 100 / calc.visibleSlidesQuantity;
        if (settings.pagination.stretch) {
            // let params = [calc.orientationSize],
            //     values = [calc.paginationItemSize + '%'];
            // if (calc.orientationSize === WIDTH) {
            //     params[1] = 'float';
            //     values[1] = LEFT;
            // }
            // calc.style += createCss(settings.pagination.style + '>' + settings.pagination.itemTag,
            //     params, values);

            let paginationItemSelector = settings.pagination.style + '>' + settings.pagination.itemTag;
            self.addStyle(paginationItemSelector, {[calc.orientationSize]: calc.paginationItemSize + '%'});
            // if (calc.orientationSize === WIDTH) {
            //     self.addStyle(paginationItemSelector, {float: LEFT})
            // }
        }
    }

    progress() {
        // add progress
    }

    scroll() {
        // add scrooll
    }

    calculateIndex() {

    }

    setSlide(index) {
        let self = this,
            calc = self.calculation;
        calc.previousSlideIndex = calc.currentSlideIndex;
        calc.currentSlideIndex = index;
        if (calc.repeatMovementDirection = (index > calc.lastMovementIndex) - (index < calc.firstMovementIndex)) {
            self.calculateIndex(); // last / first correction
        }
    }

    currentSlide() {
        return this.calculation.currentSlideIndex;
    }

    forwardOrBackward(forward, backward) {
        return this.calculation.repeatMovementDirection > 0 ? forward : backward;
    }

    startCycle(ms) {
        let self = this,
            calc = self.calculation;
        calc.timeoutId = setTimeout(function() {
            self.stopCycle();
            self.switchToNext();
            // next();
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
        console.log(this);
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
