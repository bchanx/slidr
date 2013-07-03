//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */

function SlidrException(message) {
  this.message = message;
}

function Slidr() {
  /**
   * A {mapping} of slides to their neighbors.
   */
  var _slidr = {};

  /**
   * A {mapping} of slides and their transition effects.
   */
  var _transitions = {};

  /**
   * The slide to start at.
   */
  var _start = null;

  /**
   * The current slide.
   */
  var _current = null;

  /**
   * Defines our available css transitions.
   */
  var _css = {
    'cube': {
      'init': {
        '-webkit-transition': 'all 1s cubic-bezier(0.15, 0.9, 0.25, 1)',
        '-moz-transition': 'all 1s cubic-bezier(0.15, 0.9, 0.25, 1)',
        '-o-transition': 'all 1s cubic-bezier(0.15, 0.9, 0.25, 1)',
        '-webkit-backface-visibility': 'hidden',
        '-moz-backface-visibility': 'hidden',
        'backface-visibility': 'hidden',
        '-webkit-transform-style': 'preserve-3d',
        '-moz-transform-style': 'preserve-3d',
        'transform-style': 'preserve-3d',
      },
      'reset': {
        'left': function(width) { return _cssTransform("rotateY(-90deg) translateZ(" + width/2 + "px)") },
        'right': function(width) { return _cssTransform("rotateY(90deg) translateZ(" + width/2 + "px)") },
        'up': function(height) { return _cssTransform("rotateX(90deg) translateZ(" + height/2 + "px)") },
        'down': function(height) { return _cssTransform("rotateX(-90deg) translateZ(" + height/2 + "px)") },
      },
      'in': {
        'left': function(width) { return _cssTransform("rotateY(0deg) translateZ(" + width/2 + "px)") },
        'right': function(width) { return _cssTransform("rotateY(0deg) translateZ(" + width/2 + "px)") },
        'up': function(height) { return _cssTransform("rotateX(0deg) translateZ(" + height/2 + "px)") },
        'down': function(height) { return _cssTransform("rotateX(0deg) translateZ(" + height/2 + "px)") },
      },
      'out': {
        'left': function(width) { return _cssTransform("rotateY(90deg) translateZ(" + width/2 + "px)") },
        'right': function(width) { return _cssTransform("rotateY(-90deg) translateZ(" + width/2 + "px)") },
        'up': function(height) { return _cssTransform("rotateX(-90deg) translateZ(" + height/2 + "px)") },
        'down': function(height) { return _cssTransform("rotateX(90deg) translateZ(" + height/2 + "px)") },
      } 
    }
  };

  /**
   * CSS rules to apply to all slides in our Slidr when we initialize.
   */
  function _cssInit(element, transition) {
    var css = _lookup(_css, [transition, 'init']);
    if (element && $(element).length && css) {
      var display = $(element).css('display');
      display = (display === 'none') ? 'block' : display;
      _extend(css, {
        'display': display,
        'opacity': '0',
        'position': 'absolute',
        'left': '50%',
        'margin-left': '-' + $(element).width()/2 + 'px',
        'z-index': '-1'
      });
      $(element).css(css);
      return true;
    }
    return false;
  }

  /**
   * CSS rules to apply to an `element` about to enter the Slidr viewport from `dir` with `transition` effects. 
   */
  function _cssReset(element, transition, dir) {
    var css = _lookup(_css, [transition, 'reset', dir]);
    if (element && $(element).length && css) {
      css = (dir === 'up' || dir === 'down') ? css($(element).height()) : css($(element).width());
      // Hide forces the browser to redraw.
      $(element).css(css).hide();
      return true;
    }
    return false;
  }

  /**
   * CSS rules to apply to an `element`, coming [in|out] as `type`, from the `dir` direction with `transition` effects.
   */
  function _cssApply(element, transition, type, dir) {
    var css = _lookup(_css, [transition, type, dir]);
    if (element && $(element).length && css) {
      css = (dir === 'up' || dir === 'down') ? css($(element).height()) : css($(element).width());
      var opacity = (type === 'in') ? '1' : '0';
      // Show the slide again after hiding.
      $(element).css(css).css('opacity', opacity).show();
      return true;
    }
    return false;
  }

  /**
   * Helper for applying CSS transform rules.
   */
  function _cssTransform(rules) {
    return {
      '-webkit-transform': rules,
      '-moz-transform': rules,
      '-o-transform': rules,
      'transform': rules,
    }
  }

  /**
   * Traverse [keys] in {object} to lookup a value, or null if nothing found.
   */
  function _lookup(obj, keys) {
    var result = null;
    if (!!obj && obj.constructor === Object && !!keys && keys.constructor === Array) {
      result = obj;
      for (var k in keys) {
        if (!result.hasOwnProperty(keys[k])) {
          return null;
        }
        result = result[keys[k]];
      }
    }
    return result;
  }

  /**
   * Add all key:values found in {from} to {to}, in place. Overwrites existing keys by default.
   */
  function _extend(to, from, opt_noOverwrite) {
    if (!!to && to.constructor === Object && !!from && from.constructor === Object) {
      for (var f in from) {
        if (to.hasOwnProperty(f) && !!opt_noOverwrite) {
          continue;
        }
        to[f] = from[f];
      }
    }
    return to || {};
  }

  /**
   * Get the next transition for `element` entering/leaving the viewport from `dir` direction.
   */
  function _getTransition(element, dir) {
    var direction = (dir === 'up' || dir === 'down') ? 'vertical' : 'horizontal';
    return _lookup(_transitions, [element, direction]);
  }

  /**
   * Set the `transition` for an `element` going in the `dir` movement.
   */
  function _setTransition(element, transition, dir) {
    transition = (!transition || self.transitions.indexOf(transition) < 0) ? 'cube' : transition;
    if (!_transitions[element]) {
      _transitions[element] = {};
    }
    _transitions[element][dir] = transition;
    return transition;
  }

  /**
   * Applies the out transition to an `element` being displaced by a slide coming from the `dir` direction.
   */
  function _transitionOut(element, dir) {
    if (element && $(element).length && dir) {
      var transition = _getTransition(element, dir);
      if (transition) {
        // Apply the css transform to the element.
        if (_cssApply(element, transition, 'out', dir)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Applies the in transition to an `element` entering the Slidr viewport, from the `dir` direction.
   */
  function _transitionIn(element, dir) {
    if (element && $(element).length && dir) {
      var transition = _getTransition(element, dir);
      if (transition) {
        // Apply css reset to the current element.
        if (_cssReset(element, transition, dir)) {
          // Now apply the css transform.
          if (_cssApply(element, transition, 'in', dir)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Transition to the next slide in the `dir` direction.
   */
  function _slide(dir) {
    var next = _lookup(_slidr, [_current, dir]);
    if (_current && next) {
      $(_current).stop();
      _transitionOut(_current, dir);
      _transitionIn(next, dir);
      _current = next;
      return true;
    }
    return false;
  }

  /**
   * Sets the height of our Slidr container in order to fully contain the slides.
   */
  function _setHeight(height) {
    if ($('#slidr').length) {
      $('#slidr').css('min-height', height + 'px');
    }
  }

  /**
   * Keyboard bindings for navigating Slidr.
   */
  function _dynamicBindings() {
    $(document).keydown(function(e) {
      if (e.which === 40) {
        // Down arrow
        self.down();
      } else if (e.which === 39) {
        // Right arrow
        self.right();
      } else if (e.which === 38) {
        // Up arrow
        self.up();
      } else if (e.which === 37) {
        // Left arrow
        self.left();
      }
    });
  }

  /**
   * Who am I?
   */
  var self = this;

  /**
   * [List] of available slide transitions.
   */
  self.transitions = ['cube'];

  /**
    * Adds a set of slides to our Slidr.
    * `slides` - expects an object with a `horizontal` and/or a `vertical` field, which contains [lists] of DOM elements
    * we wish to transform into slides.
    *
    * `opt_transition` - defines what transition to use for navigating the given set of slides. Slidr will use a
    * default transition if nothing is given.
    *
    * `opt_warn` - by default, Slidr does a best-effort to compile the slides according to the given specifications.
    * We silently abort adding the rest of a row if we end up redefining the same transition to two different slides.
    * Use this flag if you want it to throw an exception instead (useful during development).
    *
    * e.g. `slides`:
    * { 
    *   'horizontal': [
    *     ['#one', '#two', '#three', '#four'],
    *   ],
    *   'vertical': [
    *     ['#five', '#two', '#six'],
    *     ['#seven', '#four', '#eight'],
    *   ]
    * }
    */
  self.add = function(slides, opt_transition, opt_warn) {
    if (slides.horizontal) {
      for (var i = 0; i < slides.horizontal.length; i++) {
        self.addHorizontal(slides.horizontal[i], opt_transition, opt_warn);
      }
    }
    if (slides.vertical) {
      for (var i = 0; i < slides.vertical.length; i++) {
        self.addVertical(slides.vertical[i], opt_transition, opt_warn);
      }
    }
  };
  
  /**
   * Adds a [list] of slides we want to navigate in the left/right direction.
   */
  self.addHorizontal = function(slides, opt_transition, opt_warn) {
    var current;
    // For each slide, add it to our mapping.
    for (var i = 0; current = slides[i]; i++) {
      var newLeft = slides[i-1] || null;
      var newRight = slides[i+1] || null;
      if (_slidr[current]) {
        var existingLeft = _slidr[current].left;
        var existingRight = _slidr[current].right;
        var previousLeft = _lookup(_slidr, [newRight, 'left']);
        // Are we about to override an existing mapping?
        if ((existingRight && newRight && existingRight != newRight)
          || (existingLeft && newLeft && existingLeft != newLeft)
          || (previousLeft && previousLeft != current)
        ) {
          if (opt_warn) {
            throw new SlidrException("[Slidr] Horizontal add error.");
          }
          return false;
        }
      } else {
        _slidr[current] = {};
      }
      if (_cssInit(current, _setTransition(current, opt_transition, 'horizontal'))) {
        if (!_start) {
          _start = current;
        }
        if (newLeft) {
          _slidr[current].left = newLeft;
        }
        if (newRight) {
          _slidr[current].right = newRight;
        }
      }
    }
    return true;
  };

  /**
   * Adds a [list] of slides that we want to navigate in the up/down direction.
   */
  self.addVertical = function(slides, opt_transition, opt_warn) {
    var current;
    // For each slide, add it to our slidr mapping.
    for (var i = 0; current = slides[i]; i++) {
      var newUp = slides[i-1] || null;
      var newDown = slides[i+1] || null;
      if (_slidr[current]) {
        var existingUp = _slidr[current].up;
        var existingDown = _slidr[current].down;
        var previousUp = _lookup(_slidr, [newDown, 'up']);
        // Are we about to override an existing mapping?
        if ((existingUp && newUp && existingUp != newUp)
          || (existingDown && newDown && existingDeft != newDown)
          || (previousUp && previousUp != current)
        ) {
          if (opt_warn) {
            throw new SlidrException("[Slidr] Vertical add error.");
          }
          return false;
        }
      } else {
        _slidr[current] = {};
      }
      if (_cssInit(current, _setTransition(current, opt_transition, 'vertical'))) {
        if (!_start) {
          _start = current;
        }
        if (newUp) {       
          _slidr[current].up = newUp;
        }
        if (newDown) {
          _slidr[current].down = newDown;
        }
      }
    }
    return true;
  };

  /**
   * Slide up.
   */
  self.up = function() {
    return _slide('up');
  };

  /**
   * Slide down.
   */
  self.down = function() {
    return _slide('down');
  };

  /**
   * Slide left.
   */
  self.left = function() {
    return _slide('left');
  };

  /**
   * Slide right.
   */
  self.right = function() {
    return _slide('right');
  };

  /**
   * Start the Slidr!
   * Defaults to showing the first slide added. Specify a slide to begin with using `opt_start`.
   */
  self.init = function(opt_start) {
    if (!!opt_start && !!_slidr[opt_start]) {
      _start = opt_start;
    }
    if ($('#slidr').length && _start && $(_start).length) {
      $('#slidr').css({
        'position': 'relative',
        'margin': '0 auto',
        'display': 'table',
      });
      _current = _start;
      // Hide/show to force a redraw.
      $(_current).hide().css({'z-index': '1', 'opacity': '1'}).show();
      // TODO: Detect height changes.
      _setHeight($(_current).height());
      _dynamicBindings();
    }
  };
}

$(function() {
  if ($('#slidr').length) {
    $('#slidr').css('display', 'none');
  }
});

