slidr.js
========

A simple, lightweight javascript library for adding slide transitions to your page. No dependencies required.

Tested on Chrome 26.0, Firefox 20.0, Safari 5.1.7, IE 10, Opera 16.0. Limited support for IE8/9.

[Check out the demo here.](http://www.bchanx.com/slidr)

## Features
- **Add as many Slidr's as you want** - *even place them within each other.*
- **Dynamic resizing** - *adapts to the size of its content, unless you don't want it to.*
- **Keyboard navigation** - *move your cursor on top of a Slidr, and hit the arrow keys!*
- **Touch navigation** (mobile) - *change slides by swiping left, right, up or down!*

## Instructions
Include either `slidr.js` or `slidr.min.js` somewhere at the bottom of your html page, after the body content.

```javascript
<script type="text/javascript" src="/path/to/slidr.min.js"></script>
```

## HTML
slidr.js works on any `inline`, `inline-block` or `block` elements with an `id` defined.
Valid slides include any first-level children elements with the `data-slidr` attribute set to some unique value within the parent scope. For example:

```html
<ul id="slidr-ul" style="display: inline">
  <li data-slidr="one">apple</li>
  <li data-slidr="two">banana</li>
  <li data-slidr="three">coconut</li>
</ul>

<div id="slidr-img" style="display: inline-block">
  <img data-slidr="one" src="/static/images/apple.png"/>
  <img data-slidr="two" src="/static/images/banana.png"/>
  <img data-slidr="three" src="/static/images/coconut.png"/>
</div>

<div id="slidr-div" style="dislay: block">
  <div data-slidr="one">apple</div>
  <div data-slidr="two">banana</div>
  <div data-slidr="three">coconut</div>
</div>
```

are all valid html markup for creating three different `Slidr`'s within the same page.
(inline elements are transformed into inline-blocks in order to apply transitions).

## Javascript
A global `slidr` object is available for calling. The most minimal way of creating a slidr is this:

```javascript
slidr.create('slidr-id').start();
```

`create()` accepts an optional settings parameter as its second argument. A call with all the settings toggled looks like so:

```javascript
slidr.create('slidr-id', {
  after: function(e) { console.log('in: ' + e.in.slidr); },
  before: function(e) { console.log('out: ' + e.out.slidr); },
  breadcrumbs: true,
  controls: 'corner',
  direction: 'vertical',
  fade: false,
  keyboard: true,
  overflow: true,
  theme: '#222',
  timing: { 'cube': '0.5s ease-in' },
  touch: true,
  transition: 'cube'
}).start();
```

### Settings
Full details on available settings listed below:

| Parameter     | Type      | Default    | Description                                                                   |
| ------------- |:---------:|:----------:| -----------------------------------------------------------------------------:|
| `after`       | _function_| no-op      | Callback function after a slide transition finishes.                          |
| `before`      | _function_| no-op      | Callback function before a slide transition begins.                           |
| `breadcrumbs` | _bool_    | false      | Show or hide breadcrumbs on start(). `true` or `false`.                       |
| `controls`    | _string_  | border     | Show or hide control arrows on start(). `border`, `corner` or `none`.         |
| `direction`   | _string_  | horizontal | The default direction for new slides. `horizontal` or `h`, `vertical` or `v`. |
| `fade`        | _bool_    | true       | Whether slide transitions should fade in/out. `true` or `false`.              |
| `keyboard`    | _bool_    | false      | Whether to enable keyboard navigation upon mouseover. `true` or `false`.      |
| `overflow`    | _bool_    | false      | Whether to overflow transitions at slidr borders. `true` or `false`.          |
| `pause`       | _bool_    | false      | Whether to pause on mouseover when running in auto(). `true` or `false`.      |
| `theme`       | _string_  | #fff       | Sets color theme for breadcrumbs/controls. `#hexcode` or `rgba(value)`.       |
| `timing`      | _object_  | {}         | Custom animation timings to apply. `{'transition': 'timing'}`.                |
| `touch`       | _bool_    | false      | Whether to enable touch navigation for mobile devices. `true` or `false`.     |
| `transition`  | _string_  | linear     | The default transition to apply. `cube`, `linear`, `fade`, or `none`.         |

The `before` and `after` callback functions return the following metadata:

```javascript
{
  id: "slidr-id",
  in: {
    el: #<HTMLElement>,
    slidr: "data-slidr-in",
    trans: "transition-in",
    dir: "direction-in"
  },
  out: {
    el: #<HTMLElement>,
    slidr: "data-slidr-out",
    trans: "transition-out",
    dir: "direction-out"
  }
}
```

### Global API
The global `slidr` namespace provides the following function calls:

```javascript
/**
 * Current version.
 * @return {string} major.minor.patch.
 */
 function version() {};

/**
 * Available transitions.
 * @return {Array} of transitions.
 */
 function transitions() {};

/**
 * Creates and returns a Slidr.
 * Calling create on the same element twice returns the already instantiated Slidr.
 * @param {string} id The element id to turn into a Slidr.
 * @param {Object=} opt_settings Settings to apply.
 */
 function create(id, opt_settings) {};
 ```

### Slidr API
For javascript control, you can save a reference to the `Slidr` object as follows:

```javascript
// Initialize a Slidr. 
// Display breadcrumbs, overflow transitions, use cube transition.
var s = slidr.create('slidr-api-demo', {
  breadcrumbs: true,
  overflow: true
});

// Add horizontal slides with default linear transition.
// The extra "one" allows the slidr to circle back and loop infinitely.
s.add('h', ['one', 'two', 'three', 'one']);

// Add vertical slides using a cube transition.
s.add('v', ['five', 'four', 'three', 'five'], 'cube');

// Now start.
s.start();
```

`Slidr` functions are fully chainable (where it makes sense to do so). The following is equivalent:

```javascript
var s = slidr.create('slidr-api-demo', {
  breadcrumbs: true,
  overflow: true
}).add('h', ['one', 'two', 'three', 'one'])
  .add('v', ['five', 'four', 'three', 'five'], 'cube')
  .start();
```

The full list of available functions in a `Slidr` object is listed below:

```javascript
/**
 * Start the Slidr!
 * Automatically finds slides to create if nothing was added prior to calling start().
 * @param {string} opt_start `data-slidr` id to start on.
 * @return {this}
 */
 function start(opt_start) {};

/**
 * Check whether we can slide.
 * @param {string} next a direction ('up', 'down', 'left', 'right') or a `data-slidr` id.
 * @return {boolean}
 */
 function canSlide(next) {};

/**
 * Slide!
 * @param {string} next a direction ('up', 'down', 'left', 'right') or a `data-slidr` id.
 * @return {this}
 */
 function slide(next) {};

/**
 * Adds a set of slides.
 * @param {string} direction `horizontal || h` or `vertical || v`.
 * @param {Array} ids A list of `data-slidr` id's to add to Slidr. Slides must be direct children of the Slidr.
 * @param {string=} opt_transition The transition to apply between the slides, or uses the default.
 * @param {boolean=} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
 * @return {this}
 */
 function add(direction, ids, opt_transition, opt_overwrite) {};

/**
 * Automatically advance to the next slide after a certain timeout. Calls start() if not already called.
 * @param {int=} opt_msec The number of millis between each slide transition. Defaults to 5000 (5 seconds).
 * @param {string=} opt_direction 'up', 'down', 'left', or 'right'. Defaults to 'right'.
 * @param {string=} opt_start The `data-slidr` id to start at (only works if auto is called to start the Slidr).
 * @return {this}
 */
 function auto(opt_msec, opt_direction, opt_start) {};

/**
 * Stop auto transition if it's turned on.
 * @return {this}
 */
 function stop() {};

/**
 * Set custom animation timings.
 * @param {string|Object} transition Either a transition name (i.e. 'cube'), or a {'transition': 'timing'} object.
 * @param {string=} opt_timing The new animation timing (i.e "0.5s ease-in"). Not required if transition is an object.
 * @return {this}
 */
 function timing(transition, opt_timing) {};

/**
 * Toggle breadcrumbs.
 * @return {this}
 */
 function breadcrumbs() {};

/**
 * Toggle controls.
 * @param {string=} opt_scheme Toggle on/off if not present, else change layout. 'border', `corner` or `none`.
 * @return {this}
 */
 function controls(opt_scheme) {};
```

## CSS

### Temporary scrollbar during transitions
On some browsers, `Slidr`'s that transition beyond the viewport might force an unwanted temporary scrollbar to appear
(although this won't affect the page, the flickering can still be annoying). To fix this, add the following CSS:

```css
body {
  overflow: hidden;
}
```

### Dynamic resize
`Slidr` follows a fairly straightforward heuristic for figuring out what it's width or height should be. If the `width`
and `height` is explicitly set, `Slidr` will not resize. Otherwise, it will always adapt to the size of its content.
You can also set just one and it'll dynamic resize the other.

If `min-width` and `min-height` is defined, `Slidr` will only resize if the content exceeds those bounds.

Dynamically resizing (no width/height set):

```html
<div id="slidr-inline-dynamic" style="display: inline">
  <div data-slidr="one">good</div>
  <div data-slidr="two">gorgeous</div>
  <div data-slidr="three">unbelievable</div>
</div>
```

Static sizing (width and height set):

```html
<div id="slidr-inline-static" style="display: inline; width: 155px; height: 30px">
  <div data-slidr="one">good</div>
  <div data-slidr="two">gorgeous</div>
  <div data-slidr="three">unbelievable</div>
</div>
```

### Slidr controllers
`Slidr` controllers are marked up like so:

```html
<aside id="{slidr-id}-control">
  <div class="slidr-control up"></div>
  <div class="slidr-control down"></div>
  <div class="slidr-control left"></div>
  <div class="slidr-control right"></div>
</aside>
```

You can customize the look of `Slidr` controls through CSS selectors like below:

```css
// Customizing a specific controller arrow.
aside[id="{slidr-id}-control"] .slidr-control.right {
  width: 50px !important;
  height: 50px !important;
  top: 50% !important;
  margin-top: -25px !important;
  right: -25px !important;
  border-radius: 25px;
  background: url('/static/images/arrow_right.png') 14px 13px no-repeat black;
  opacity: 0.4;
}

aside[id="{slidr-id}-control"] .slidr-control.right:hover {
  opacity: 1;
}
```

Note: controller arrows make use of the `:after` psuedo element.
To hide the default triangular arrow, use the following CSS:

```css
// Hide a single arrow within a single controller.
aside[id="{slidr-id}-control"] .slidr-control.right:after {
  border-color: transparent !important;
}

// Hide all arrows within a single controller.
aside[id="{slidr-id}-control"] .slidr-control:after {
  border-color: transparent !important;
}

// Hide all Slidr arrows.
aside[id*="-control"] .slidr-control:after {
  border-color: transparent !important;   
}
```

### Slidr breadcrumbs

`Slidr` breadcrumbs have a similar HTML markup.
Each `ul` denotes an entire row, while each `li` denotes an individual breadcrumb:

```html
<aside id="{slidr-id}-breadcrumbs">
  <ul class="slidr-breadcrumbs">
    <li></li>
    <li class="normal"></li>
    <li class="normal active"></li>
  </ul>
  ...
</aside>
```

Thus you can configure them like so:

```css
// Customize the position, size, border color and background color.
aside[id="{slidr-id}-breadcrumbs"] {
  right: 50% !important;
  margin-right: -41px !important;
}

aside[id="{slidr-id}-breadcrumbs"] .slidr-breadcrumbs li {
  width: 15px !important;
  height: 15px !important;
  margin: 3px !important;
}

aside[id="{slidr-id}-breadcrumbs"] .slidr-breadcrumbs li.normal {
  border-color: white !important;
}

aside[id="{slidr-id}-breadcrumbs"] .slidr-breadcrumbs li.active {
  background-color: black !important;
}
```

In the worst case, feel free to create your own controllers and access via the Slidr API instead!

For further questions or issues, visit [here](https://github.com/bchanx/slidr/issues).

## License

This software is free to use under the MIT license.
