//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */

var Slidr = Slidr || function() {
  /**
   * Who am I?
   */
  var self = this;

  /**
   * [List] of available slide transitions.
   */
  self.transitions = ['cube', 'linear', 'none'];

  /**
   * Start the Slidr!
   * Defaults to showing the first slide added. Specify a slide to begin with using `opt_start`.
   */
  self.init = function(opt_start) {
    if (!_initialized && $('#slidr').length) {
      if (!_start && !!opt_start) {
        _start = opt_start;
      }
      if (_start && $(_start).length && !!_slidr[_start]) {
        $('#slidr').css({'position': 'relative', 'display': document.getElementById('slidr').style.display || 'table'});
        _current = _start;
        // Hide/show to force a redraw.
        $(_current).hide().css({'opacity': '1', 'z-index': '1', 'pointer-events': 'auto'}).fadeIn(500);
        _autoResize();
        _dynamicBindings();
        _initialized = true;
      }
    }
    return self;
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
   * Adds a set of horizontal slides.
   * @param {Array} slides A list of elements id's to add to Slidr. Elements must be direct children of the Slidr.
   * @param {String?} opt_transition The transition to apply between the slides, defaults to none.
   * @param {Boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
   */
  self.addHorizontal = function(slides, opt_transition, opt_overwrite) {
    _addHorizontal(slides, opt_transition, opt_overwrite);
  };

  /**
   * Adds a set of vertical slides.
   * @param {Array} slides A list of elements id's to add to Slidr. Elements must be direct children of the Slidr.
   * @param {String?} opt_transition The transition to apply between the slides, defaults to none.
   * @param {Boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
   */
  self.addVertical = function(slides, opt_transition, opt_overwrite) {
    _addVertical(slides, opt_transition, opt_overwrite);
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
   * Whether we've successfully initialized.
   */
  var _initialized = false;

  /**
   * The slide to start at.
   */
  var _start = null;

  /**
   * The current slide.
   */
  var _current = null;

  /**
   * The default transition.
   */
  var _defaultTransition = 'none';

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
      'supported': _slidrCSS.supports(['animation', 'backface-visibility', 'transform-style', 'transform', 'opacity']),
      'init': function() { return _slidrCSS.fixup({ 'backface-visibility': 'hidden',
        'transform-style': 'preserve-3d' });
      },
      'timing': function(animation) { return animation + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
      'in': {
        'left': function(width) { _slidrCSS.createKeyframe('slidr-cube-in-left', {
          '0': { 'transform': 'rotateY(90deg) translateZ(' + width/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateY(0deg) translateZ(' + width/2 + 'px)', 'opacity': '1' }})
        },
        'right': function(width) { _slidrCSS.createKeyframe('slidr-cube-in-right', {
          '0': { 'transform': 'rotateY(-90deg) translateZ(' + width/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateY(0deg) translateZ(' + width/2 + 'px)', 'opacity': '1' }})
        },
        'up': function(height) { _slidrCSS.createKeyframe('slidr-cube-in-up', {
          '0': { 'transform': 'rotateX(-90deg) translateZ(' + height/2 + 'px)', 'opacity': '0' },
          '100': { 'transform': 'rotateX(0deg) translateZ(' + height/2 + 'px)', 'opacity': '1' }})
        },
        'down': function(height) { _slidrCSS.createKeyframe('slidr-cube-in-down', {
          '0': { 'transform': 'rotateX(90deg) translateZ(' + height/2 + 'px)', 'opacity': '0' },
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
      'supported': _slidrCSS.supports(['transform', 'opacity']),
      'init': function() { return null; },
      'timing': function(animation) { return animation + ' 0.6s ease-out 0s'; },
      'in': {
        'left': function(width) { _slidrCSS.createKeyframe('slidr-linear-in-left', {
          '0': { 'transform': 'translateX(' + width + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateX(0px)', 'opacity': '1' }})
        },
        'right': function(width) { _slidrCSS.createKeyframe('slidr-linear-in-right', {
          '0': { 'transform': 'translateX(-' + width + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateX(0px)', 'opacity': '1' }})
        },
        'up': function(height) { _slidrCSS.createKeyframe('slidr-linear-in-up', {
          '0': { 'transform': 'translateY(' + height + 'px)', 'opacity': '0' },
          '100': { 'transform': 'translateY(0px)', 'opacity': '1' }})
        },
        'down': function(height) { _slidrCSS.createKeyframe('slidr-linear-in-down', {
          '0': { 'transform': 'translateY(-' + height + 'px)', 'opacity': '0' },
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
          '100': { 'transform': 'translateY(-' + height + 'px)', 'opacity': '0' }})
        },
      }
    },
    'none': {
      'supported': true,
      'init': function() { return null; },
      'timing': function() { return null; },
    }
  };

  /**
   * CSS rules to apply to slides in our Slidr on initialize.
   */
  function _cssInit(element, transition) {
    if (element && $(element).length) {
      var css = _lookup(_css, [transition, 'init'])() || {};
      if (!_slidr[element]['initialized']) {
        var display = $(element).css('display');
        var extra = {
          'display': (display === 'none') ? 'block' : display,
          'position': 'absolute',
          'left': '50%',
          'margin-left': '-' + $(element).width()/2 + 'px',
          'opacity': '0',
          'z-index': '0',
          'pointer-events': 'none'
        };
        _extend(extra, css);
        _slidr[element]['initialized'] = true;
      }
      $(element).css(css);
      return true;
    }
    return false;
  }

  /**
   * Animate the `element` coming [in|out] as `type`, from the `dir` direction with `transition` effects.
   */
  function _cssAnimate(element, transition, type, dir) {
    if (element && $(element).length && type) {
      var css = {
        'opacity': (type === 'in') ? '1': '0',
        'z-index': (type === 'in') ? '1': '0',
        'pointer-events': (type === 'in') ? 'auto': 'none'
      };
      if (transition && dir && _lookup(_css, [transition, 'supported'])) {
        var animation = _slidrCSS.resolve('animation');
        var timing = _lookup(_css, [transition, 'timing'])(['slidr', transition, type, dir].join('-'));
        if (!!animation && !!timing) {
          var keyframe = _lookup(_css, [transition, type, dir]);
          (dir === 'up' || dir === 'down') ? keyframe($(element).height()) : keyframe($(element).width());
          css[animation] = timing;
        }
      }
      $(element).css(css);
      return true;
    }
    return false;
  }

  /**
   * Get the next transition for `element` entering/leaving the viewport from `dir` direction.
   */
  function _getTransition(element, dir) {
    return _lookup(_transitions, [element, dir]);
  }

  /**
   * Set the `transition` for an `element` going in the `dir` movement.
   */
  function _setTransition(element, dir, transition) {
    transition = (!transition
      || self.transitions.indexOf(transition) < 0
      || !_lookup(_css, [transition, 'supported'])) ? _defaultTransition : transition;
    if (!_transitions[element]) {
      _transitions[element] = {};
    }
    _transitions[element][dir] = transition;
    return transition;
  }

  /**
   * Apply a transition to an `element`, coming [in|out] of the Slidr as `type`, in the `dir` direction.
   */
  function _applyTransition(element, type, dir) {
    if (element && $(element).length && type && dir) {
      var transition = _getTransition(element, dir);
      if (transition) {
        return _cssAnimate(element, transition, type, dir);
      }
    }
    return false;
  }

  /**
   * Returns the opposite direction.
   */
  function _opposite(dir) {
    return (dir === 'up') ? 'down' : (dir === 'down') ? 'up' : (dir === 'left') ? 'right' : 'left';
  }

  /**
   * Check if a Slidr transition will have overflow issues.
   */
  function _hasOverflow(current, next, dir) {
    return ((dir === 'left' || dir === 'right')
            && (_getTransition(current, dir) === 'linear' || _getTransition(next, _opposite(dir)) === 'linear'))
  }

  /**
   * Transition to the next slide in the `dir` direction.
   */
  function _slide(dir) {
    var next = _lookup(_slidr, [_current, dir]);
    if (!!_current && !!next) {
      $(_current).stop();
      $('#slidr').css('overflow', (_hasOverflow(_current, next, dir)) ? 'hidden' : 'auto');
      _applyTransition(_current, 'out', dir);
      _current = next;
      _applyTransition(next, 'in', _opposite(dir));
      return true;
    }
    return false;
  }

  /**
   * Watch for height and width changes in the slides, propagate the change to the slidr container.
   */
  function _autoResize() {
    var height = null;
    var width = null;
    var isDynamicHeight = document.getElementById('slidr').style.height === '';
    var isDynamicWidth = document.getElementById('slidr').style.width === '';
    var timerId = setInterval((function watchDimensions() {
      if (!$('#slidr').length) {
        clearInterval(timerId);
        return;
      } else if ($('#slidr').css('visibility') === 'hidden') {
        height = _setHeight(0);
        width = _setWidth(0);
      } else if (_current && $(_current).length) {
        var newHeight = $(_current).height();
        if (isDynamicHeight && height != newHeight) {
          height = _setHeight(newHeight);
        }
        var parentWidth = $('#slidr').parent().width();
        var newWidth = $(_current).width();
        var ignorePadding = false;
        if (parentWidth > newWidth) {
          newWidth = parentWidth;
          ignorePadding = true;
        }
        if (isDynamicWidth && width != newWidth) {
          width = _setWidth(newWidth, ignorePadding);
        }
      }
      return watchDimensions;
    })(), 250);
  }

  /**
   * Sets the height of our Slidr container.
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
   * Sets the width of our Slidr container.
   */
  function _setWidth(width, ignorePadding) {
    if ($('#slidr').length) {
      var padding = (!!ignorePadding) ? 0 : parseInt($('#slidr').css('padding-left').slice(0, -2)) +
        parseInt($('#slidr').css('padding-right').slice(0, -2));
      var margin = parseInt($('#slidr').css('margin-left').slice(0, -2)) +
        parseInt($('#slidr').css('margin-right').slice(0, -2));
      $('#slidr').css('width', width + padding - margin + 'px');
      return width;
    }
    return null;
  }

  /**
   * Keyboard bindings for navigating Slidr.
   */
  function _dynamicBindings() {
    $(document).keydown(function(e) {
      // Down arrow
      if (e.which === 40) { self.down(); }
      // Right arrow
      else if (e.which === 39) { self.right(); }
      // Up arrow
      else if (e.which === 38) { self.up(); }
      // Left arrow
      else if (e.which === 37) { self.left(); }
    });
  }

  /**
   * Validate the slides we're trying to add isn't going to conflict with existing mapping.
   */
  function _validateAdd(slides, dir, transition) {
    if (!_isArray(slides) || !dir) {
      return false;
    }
    var prev = (dir === 'horizontal') ? 'left' : 'up';
    var next = (dir === 'horizontal') ? 'right' : 'down';
    var current;
    // For each slide we're trying to add, check it against our known mapping.
    for (var i = 0; current = slides[i]; i++) {
      if (!current || !$(current).length) {
        return false;
      }
      if (_slidr[current]) {
        var newPrev = slides[i-1] || null;
        var newNext = slides[i+1] || null;
        var existingPrev = _slidr[current][prev] || null;
        var existingNext = _slidr[current][next] || null;
        var existingPrevTransition = _lookup(_transitions, [current, prev]);
        var existingNextTransition = _lookup(_transitions, [current, next]);
        var previousPrev = _lookup(_slidr, [newNext, prev]);
        // Are we about to override an existing mapping?
        if ((existingNext && newNext && existingNext != newNext)
          || (existingPrev && newPrev && existingPrev != newPrev)
          || (previousPrev && previousPrev != current)
          || (newPrev && existingPrevTransition && existingPrevTransition != transition)
          || (newNext && existingNextTransition && existingNextTransition != transition)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Adds a [list] of slides we want to navigate in the left/right direction.
   */
  function _addHorizontal(slides, opt_transition, opt_overwrite) {
    var transition = opt_transition || _defaultTransition;
    if (!_validateAdd(slides, 'horizontal', transition) && !opt_overwrite) {
      if (!!console && !!console.log) {
        console.log('[Slidr] horizontal add error, conflicts with existing mapping.');
      }
      return false;
    }
    var current;
    // For each slide, add it to our mapping.
    for (var i = 0; current = slides[i]; i++) {
      if (!_isObject(_slidr[current])) {
        _slidr[current] = {};
      }
      if (!!slides[i-1]) {
        _slidr[current]['left'] = slides[i-1];
        _setTransition(current, 'left', transition);
      }
      if (!!slides[i+1]) {
        _slidr[current]['right'] = slides[i+1];
        _setTransition(current, 'right', transition);
      }
      _cssInit(current, transition);
      _start = (!_start) ? current : _start;
    }
    return (!_initialized) ? self.init() : true;
  }

  /**
   * Adds a [list] of slides that we want to navigate in the up/down direction.
   */
  function _addVertical(slides, opt_transition, opt_overwrite) {
    var transition = opt_transition || _defaultTransition;
    if (!_validateAdd(slides, 'vertical', transition) && !opt_overwrite) {
      if (!!console && !!console.log) {
        console.log('[Slidr] vertical add error, conflicts with existing mapping.');
      }
      return false;
    }
    var current;
    // For each slide, add it to our mapping.
    for (var i = 0; current = slides[i]; i++) {
      if (!_isObject(_slidr[current])) {
        _slidr[current] = {};
      }
      if (!!slides[i-1]) {
        _slidr[current]['up'] = slides[i-1];
        _setTransition(current, 'up', transition);
      }
      if (!!slides[i+1]) {
        _slidr[current]['down'] = slides[i+1];
        _setTransition(current, 'down', transition);
      }
      _cssInit(current, transition);
      _start = (!_start) ? current : _start;
    }
    return (!_initialized) ? self.init() : true;
  }

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
     * Check whether all given css properties are supported in the browser.
     */
    self.supports = function(properties) {
      if (_isString(properties)) {
        properties = [properties];
      }
      if (_isArray(properties)) {
        for (var i = 0; i < properties.length; i++) {
          if (!self.resolve(properties[i])) {
            return false;
          }
        }
        return true;
      }
      return false;
    };

    /**
     * Applies necessary CSS browser prefixes for a set of properties.
     */
    self.fixup = function(properties) {
      var result = {};
      if (_isObject(properties)) {
        for (var p in properties) {
          if (self.resolve(p)) {
            result[self.resolve(p)] = properties[p];
          }
        }
      }
      return result;
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

    /**
     * Pointer to the document style sheets.
     */
    var _style = document.getElementsByTagName('html')[0]['style'];

    /**
     * Pointer to our Slidr CSS style sheet.
     */
    var _styleSheet = null;

    /**
     * The CSS prefix for the displaying browser.
     */
    var _cssPrefix = null;

    /**
     * The DOM prefix for the displaying browser.
     */
    var _domPrefix = null;

    /**
     * The CSS property to prefix mapping.
     */
    var _propertyCache = {};

    /**
     * Adds a CSS keyframe rule to our custom stylesheet.
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

    /**
     * Given a css property and a optional dom prefix, tranlate it into a DOM document representation.
     */
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

    /**
     * Given a css property, retrieves the DOM prefix if applicable.
     */
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

    /**
     * Given a css property, retrieves the browser prefix if applicable.
     */
    function _getCSSPrefix(cssProperty) {
      if (_cssPrefix === null && _isString(cssProperty)) {
        _getDOMPrefix(cssProperty);
      }
      return _cssPrefix;
    }
  };
};

