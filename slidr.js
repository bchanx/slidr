//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */

var SlidrException = SlidrException || function(message) {
  this.message = message;
};

var Slidr = Slidr || function() {
  /**
   * Who am I?
   */
  var self = this;

  /**
   * [List] of available slide transitions.
   */
  self.transitions = ['cube', 'linear'];

  /**
   * Start the Slidr!
   * Defaults to showing the first slide added. Specify a slide to begin with using `opt_start`.
   */
  self.init = function(opt_start) {
    if (!!opt_start && !!_slidr[opt_start]) {
      _start = opt_start;
    }
    if ($('#slidr').length && _start && $(_start).length) {
      var css = {
        'position': 'relative',
        'width': '100%',
        'display': 'table',
      };
      var boxSizing = _slidrCSS.resolve('box-sizing');
      if (!!boxSizing) {
        css[boxSizing] = 'border-box';
      }
      $('#slidr').css(css);
      _current = _start;
      // Hide/show to force a redraw.
      $(_current).hide().css({'pointer-events': 'auto', 'opacity': '1'}).fadeIn(500);
      _watchHeightChange();
      _dynamicBindings();
    }
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
        _addHorizontal(slides.horizontal[i], opt_transition, opt_warn);
      }
    }
    if (slides.vertical) {
      for (var i = 0; i < slides.vertical.length; i++) {
        _addVertical(slides.vertical[i], opt_transition, opt_warn);
      }
    }
  };
  
  /**
   * Convenience helper for adding a set of horizontal slides.
   */
  self.addHorizontal = function(slides, opt_transition, opt_warn) {
    _addHorizontal(slides, opt_transition, opt_warn);
  };

  /**
   * Convenience helper for adding a set of vertical slides.
   */
  self.addVertical = function(slides, opt_transition, opt_warn) {
    _addVertical(slides, opt_transition, opt_warn);
  };

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
   * Helper for generating browser compatible CSS.
   */
  var _slidrCSS = new SlidrCSS();

  /**
   * Check if object is a string.
   */
  function _isString(obj) {
    return (!!obj) && (typeof obj === 'string');
  }

  /**
   * Check if object is an [Array].
   */
  function _isArray(obj) {
    return (!!obj) && (obj.constructor === Array);
  }

  /**
   * Check if object is an {Object}.
   */
  function _isObject(obj) {
    return (!!obj) && (obj.constructor === Object);
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
   * Add all key:values found in [{from}, ..] to {to}, in place. Overwrites existing keys by default.
   */
  function _extend(from, to, opt_noOverwrite) {
    to = (_isObject(to)) ? to : {};
    if (_isObject(from)) {
      from = [from];
    }
    if (_isArray(from)) {
      var values;
      for (var i = 0; values = from[i]; i++) {
        for (var v in values) {
          if (to.hasOwnProperty(v) && !!opt_noOverwrite) {
            continue;
          }
          to[v] = values[v];
        }
      }
    }
    return to;
  }

  /**
   * Defines our available css transitions.
   */
  var _css = {
    'cube': {
      'init': _extend([
        _cssPrefixer('backface-visibility', 'hidden', ['webkit', 'moz']),
        _cssPrefixer('transform-style', 'preserve-3d', ['webkit', 'moz'])
      ]),
      'timing': function(name) { return name + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
      'in': {
        'left': function(width) { _slidrCSS.createKeyframe('slidr-cube-in-left', {
          '0': { 'transform': 'rotateY(-90deg) translateZ(' + width/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateY(0deg) translateZ(' + width/2 + 'px)', 'opacity': '1' }})
        },
        'right': function(width) { _slidrCSS.createKeyframe('slidr-cube-in-right', {
          '0': { 'transform': 'rotateY(90deg) translateZ(' + width/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateY(0deg) translateZ(' + width/2 + 'px)', 'opacity': '1' }})
        },
        'up': function(height) { _slidrCSS.createKeyframe('slidr-cube-in-up', {
          '0': { 'transform': 'rotateX(90deg) translateZ(' + height/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateX(0deg) translateZ(' + height/2 + 'px)', 'opacity': '1' }})
        },
        'down': function(height) { _slidrCSS.createKeyframe('slidr-cube-in-down', {
          '0': { 'transform': 'rotateX(-90deg) translateZ(' + height/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateX(0deg) translateZ(' + height/2 + 'px)', 'opacity': '1' }})
        },
      },
      'out': {
        'left': function(width) { _slidrCSS.createKeyframe('slidr-cube-out-left', {
          '0': { 'transform': 'rotateY(0deg) translateZ(' + width/2 + 'px)', 'opacity': '1' },
          '100': { 'transform': 'rotateY(90deg) translateZ(' + width/2 + 'px)', 'opacity': '0' }})
        },
        'right': function(width) { _slidrCSS.createKeyframe('slidr-cube-out-right', {
          '0': { 'transform': 'rotateY(0deg) translateZ(' + width/2 + 'px)', 'opacity': '1' },
          '100': { 'transform': 'rotateY(-90deg) translateZ(' + width/2 + 'px)', 'opacity': '0' }})
        },
        'up': function(height) { _slidrCSS.createKeyframe('slidr-cube-out-up', {
          '0': { 'transform': 'rotateX(0deg) translateZ(' + height/2 + 'px)', 'opacity': '1' },
          '100': { 'transform': 'rotateX(-90deg) translateZ(' + height/2 + 'px)', 'opacity': '0' }})
        },
        'down': function(height) { _slidrCSS.createKeyframe('slidr-cube-out-down', {
          '0': { 'transform': 'rotateX(0deg) translateZ(' + height/2 + 'px)', 'opacity': '1' },
          '100': { 'transform': 'rotateX(90deg) translateZ(' + height/2 + 'px)', 'opacity': '0' }})
        },
      }
    },
    'linear': {
      'init': null,
      'timing': function(name) { return name + ' 0.6s ease-out 0s'; },
      'in': {
        'left': function(width) { _slidrCSS.createKeyframe('slidr-linear-in-left', {
          '0': { 'transform': 'translateX(-' + width + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateX(0px)', 'opacity': '1' }})
        },
        'right': function(width) { _slidrCSS.createKeyframe('slidr-linear-in-right', {
          '0': { 'transform': 'translateX(' + width + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateX(0px)', 'opacity': '1' }})
        },
        'up': function(height) { _slidrCSS.createKeyframe('slidr-linear-in-up', {
          '0': { 'transform': 'translateY(-' + height + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateY(0px)', 'opacity': '1' }})
        },
        'down': function(height) { _slidrCSS.createKeyframe('slidr-linear-in-down', {
          '0': { 'transform': 'translateY(' + height + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateY(0px)', 'opacity': '1' }})
        },
      },
      'out': {
        'left': function(width) { _slidrCSS.createKeyframe('slidr-linear-out-left', {
          '0': { 'transform': 'translateX(0px)', 'opacity': '1' },
          '100': { 'transform': 'translateX(' + width + 'px)', 'opacity': '0' }})
        },
        'right': function(width) {_slidrCSS.createKeyframe('slidr-linear-out-right', {
          '0': { 'transform': 'translateX(0px)', 'opacity': '1' },
          '100': { 'transform': 'translateX(-' + width + 'px)', 'opacity': '0' }})
        },
        'up': function(height) { _slidrCSS.createKeyframe('slidr-linear-out-up', {
          '0': { 'transform': 'translateY(0px)', 'opacity': '1' },
          '100': { 'transform': 'translateY(' + height + 'px)', 'opacity': '0' }})
        },
        'down': function(height) { _slidrCSS.createKeyframe('slidr-linear-out-down', {
          '0': { 'transform': 'translateY(0px)', 'opacity': '1' },
          '100': { 'transform': 'translateY(-' + height + ')', 'opacity': '0' }})
        },
      }
    }
  };

  /**
   * Append css browser prefixes to properties.
   * @param {string} property CSS property name.
   * @param {string || Array} values CSS property value(s) to apply.
   * @param {Array} prefixes [list] of browser prefixes to append.
   * @return {Object} map of css {property:value}.
   */
  function _cssPrefixer(property, values, prefixes) {
    var css = {};
    if (!!property && !!values) {
      values = (_isString(values)) ? values.split(', ') : values;
      if (_isArray(values)) {
        css[property] = values.join(', ');
        if (_isArray(prefixes) && prefixes.length) {
          var hasTransform = -1;
          for (var i = 0; i < values.length; i++) {
            if (values[i].indexOf('transform') == 0) {
              hasTransform = i;
              break;
            }
          }
          for (var i = 0; i < prefixes.length; i++) {
            var prefix = '-' + prefixes[i] + '-';
            var original = null;
            if (hasTransform >= 0) {
              original = values[hasTransform];
              values[hasTransform] = prefix + original;
            }
            css[prefix + property] = values.join(', ');
            if (hasTransform >= 0 && original) {
              values[hasTransform] = original;
            }
          }
        }
      }
    }
    return css;
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
   * CSS rules to apply to all slides in our Slidr when we initialize.
   */
  function _cssInit(element, transition) {
    var css = _lookup(_css, [transition, 'init']) || {};
    if (element && $(element).length && css) {
      var display = $(element).css('display');
      var extra = {
        'display': (display === 'none') ? 'block' : display,
        'opacity': '0',
        'position': 'absolute',
        'left': '50%',
        'margin-left': '-' + $(element).width()/2 + 'px',
        'pointer-events': 'none'
      };
      $(element).css(_extend(extra, css));
      return true;
    }
    return false;
  }

  /**
   * Animate the `element` coming [in|out] as `type`, from the `dir` direction with `transition` effects.
   */
  function _cssAnimate(element, transition, type, dir) {
    if (element && $(element).length) {
      var animation = _slidrCSS.resolve('animation');
      if (!!animation) {
        var timing = _lookup(_css, [transition, 'timing'])(['slidr', transition, type, dir].join('-'));
        var keyframe = _lookup(_css, [transition, type, dir]);
        (dir === 'up' || dir === 'down') ? keyframe($(element).height()) : keyframe($(element).width());
        var css = {
          'opacity': (type === 'in') ? '1': '0',
          'pointer-events': (type === 'in') ? 'auto': 'none'
        };
        css[animation] = timing;
        $(element).css(css);
        return true;
      }
    }
    return false;
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
        return _cssAnimate(element, transition, 'out', dir);
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
        return _cssAnimate(element, transition, 'in', dir);
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
      var overflow = (dir === 'left' || dir === 'right') ? 'hidden' : 'auto';
      $('#slidr').css('overflow', overflow);
      _transitionOut(_current, dir);
      _current = next;
      _transitionIn(_current, dir);
      return true;
    }
    return false;
  }

  /**
   * Watch for height changes in the slides, propagate the change to the slidr container.
   */
  function _watchHeightChange() {
    var height = null;
    var timerId = setInterval((function watchHeight() {
      if (!$('#slidr').length) {
        clearInterval(timerId);
        return;
      } else if ($('#slidr').css('visibility') === 'hidden') {
        height = _setHeight(0);
      } else if (_current && $(_current).length && height != $(_current).height()) {
        height = _setHeight($(_current).height());
      }
      return watchHeight;
    })(), 250);
  }

  /**
   * Sets the height of our Slidr container in order to fully contain the slides.
   */
  function _setHeight(height) {
    if ($('#slidr').length) {
      var padding = parseInt($('#slidr').css('padding-top').slice(0, -2)) +
        parseInt($('#slidr').css('padding-bottom').slice(0, -2));
      $('#slidr').css('height', height + padding + 'px');
      return height;
    }
    return null;
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
   * Adds a [list] of slides we want to navigate in the left/right direction.
   */
  function _addHorizontal(slides, opt_transition, opt_warn) {
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
  }

  /**
   * Adds a [list] of slides that we want to navigate in the up/down direction.
   */
  function _addVertical(slides, opt_transition, opt_warn) {
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
  }

  // TODO: remove me!
  self.SlidrCSSHelper = function() {
    return new SlidrCSS();
  };

  /**
   * Helper for creating Slidr CSS.
   */
  function SlidrCSS() {

    var self = this;

    /**
     * Resolves a css property name to the browser supported name, or null if not supported.
     */
    self.resolve = function(cssProperty) {
      if (_propertyCache[cssProperty] !== undefined) {
        return _propertyCache[cssProperty];
      }
      var result = _normalize(cssProperty);
      if (_style[result] !== undefined) {
        _propertyCache[cssProperty] = cssProperty;
        return cssProperty;
      }
      var prefix = _getDOMPrefix(cssProperty);
      if (!!prefix) {
        result = _normalize(cssProperty, prefix);
        if (_style[result] !== undefined) {
          _propertyCache[cssProperty] = _getCSSPrefix() + cssProperty;
          return _getCSSPrefix() + cssProperty;
        }
      }
      // Browser does not support this property.
      _propertyCache[cssProperty] = null;
      return null;
    };

    /**
     * Creates a keyframe animation rule.
     */
    self.createKeyframe = function(name, rules) {
      // Make sure we support animations.
      if (!self.resolve('animation')) {
        return false;
      }
      // Make sure all animation properties are supported.
      for (var r in rules) {
        var properties = rules[r];
        for (var p in properties) {
          if (!self.resolve(p)) {
            return false;
          }
        }
      }
      var prefix = _cssPrefix || '';
      var rule = ['@' + prefix + 'keyframes ' + name + ' {'];
      for (var r in rules) {
        rule.push(r + '% {');
        var properties = rules[r];
        for (var p in properties) {
          rule.push(self.resolve(p) + ': ' + properties[p] + ';');
        }
        rule.push('}');
      }
      rule.push('}');
      rule = rule.join(' ');
      _addKeyframeRule(name, rule);
    };

    var _style = document.getElementsByTagName('html')[0]['style'];

    var _styleSheet = null;

    var _cssPrefix = null;

    var _domPrefix = null;

    var _propertyCache = {};

    /**
     * Adds a CSS rule to our custom stylesheet.
     */
    function _addKeyframeRule(name, rule) {
      if (!_styleSheet) {
        var styleSheetIndex = 0;
        if (document.styleSheets && document.styleSheets.length) {
          styleSheetIndex = document.styleSheets.length;
        }
        var style = document.createElement('style');
        document.head.appendChild(style);
        _styleSheet = document.styleSheets[styleSheetIndex];
      }
      var rules = _styleSheet.cssRules;
      for (var r = 0; r < rules.length; r++) {
        // Delete the rule if it already exists.
        if (rules[r]['name'] == name) {
          _styleSheet.deleteRule(r);
          break;
        }
      }
      // Now insert it. 
      _styleSheet.insertRule(rule, rules.length);
    }

    function _normalize(cssProperty, opt_domPrefix) {
      var property = cssProperty;
      if (_isString(property)) {
        property = property.split('-');
        for (var i = 0; i < property.length; i++) {
          var part = property[i];
          property[i] = part[0].toUpperCase() + part.toLowerCase().slice(1);
        }
        if (!!opt_domPrefix) {
          property.unshift(opt_domPrefix);
        } else {
          property[0] = property[0].toLowerCase();
        }
        property = property.join('');
      }
      return property;
    }

    function _getDOMPrefix(cssProperty) {
      if (_domPrefix === null && _isString(cssProperty)) {
        var DOMPrefixes = ['Webkit', 'Moz', 'ms', 'O', 'Khtml'];
        for (var i = 0; i < DOMPrefixes.length; i++) {
          if (_style[_normalize(cssProperty, DOMPrefixes[i])] !== undefined) {
            _domPrefix = DOMPrefixes[i];
            _cssPrefix = '-' + DOMPrefixes[i].toLowerCase() + '-';
            break;
          }
        }
      }
      return _domPrefix;
    }

    function _getCSSPrefix(cssProperty) {
      if (_cssPrefix === null && _isString(cssProperty)) {
        _getDOMPrefix(cssProperty);
      }
      return _cssPrefix;
    }
  };
};

$(function() {
  if ($('#slidr').length) {
    $('#slidr').css('display', 'none');
  }
});

