//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */

(function(window, document, undefined) {

  /**
   * Traverse [keys] in {object} to lookup a value, or null if nothing found.
   */
  function lookup(obj, keys) {
    var result = obj;
    for (var k in keys) {
      if (!result.hasOwnProperty(keys[k])) return null;
      result = result[keys[k]];
    }
    return result;
  }

  /**
   * Merge all properties from {arguments} to {obj}. Overwrites.
   */
  function extend(obj /* arg1, arg2.. */) {
    var arg;
    for (var i = 1; arg = arguments[i]; i++) for (var a in arg) obj[a] = arg[a];
    return obj;
  }

  /**
   * Check whether node a contains node b.
   */
  function contains(a, b) {
    return (a.contains) ? a.contains(b) : a.compareDocumentPosition(b) & 16;
  }

  /**
   * Check if object is a string.
   */
  function isString(obj) {
    return typeof obj === 'string';
  }

  /**
   * Helper for generating browser compatible CSS.
   */
  var _slidrCSS = new SlidrCSS();

  /**
   * If `action` is a string, do a css lookup. Otherwise, add css styles to `el`.
   */
  function css(el, action) {
    if (isString(action)) {
      var style = window.getComputedStyle(el)[_slidrCSS.resolve(action)];
      return (style) ? (style.slice(-2) === 'px' && style.indexOf('px') == style.length - 2) ? 
        parseInt(style.slice(0, -2)) : style : 'none';
    }
    for (a in action) if (_slidrCSS.resolve(a)) el.style[_slidrCSS.resolve(a)] = action[a];
    return el;
  }


  var Slidr = window.Slidr = function(id, opt_settings) {
    var _slidr = document.getElementById(id);
    var _settings = extend({
      'transition': 'none',
      'direction': 'horizontal',
      'fading': true,
    }, opt_settings);

    var self = this;

    /**
     * [List] of available slide transitions.
     */
    self.transitions = ['cube', 'fade', 'linear', 'none'];

    /**
     * Start the Slidr!
     * @param {string} opt_start slide to start on.
     */
    self.start = function(opt_start) {
      if (!_started && _slidr) {
        if (_slides[opt_start]) _start = opt_start;
        var display = css(_slidr, 'display');
        var position = css(_slidr, 'position');
        css(_slidr, {
          'visibility': 'visible',
          'opacity': '1',
          'display': (display !== 'inline-block') ? 'table' : display,
          'position': (position === 'static') ? 'relative' : position
        });
        _display();
        _autoResize();
        _started = true;
      }
      return self;
    };

    /**
     * Check whether we can slide.
     * @param {string} dir 'up', 'down', 'left' or 'right'.
     * @return {boolean}
     */
    self.canSlide = function(dir) {
      return _started && !!lookup(_slides, [_current, dir]);
    };

    /**
     * Slide.
     * @param {string} dir slide 'up', 'down', 'left', or 'right'.
     */
    self.slide = function(dir) {
      return _started && _slide(dir);
    };

    /**
     * Adds a set of horizontal slides.
     * @param {Array} slides A list of data-slidr id's to add to Slidr. Slides must be children elements of the Slidr.
     * @param {String?} opt_transition The transition to apply between the slides, defaults to none.
     * @param {Boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
     */
    self.horizontal = function(slides, opt_transition, opt_overwrite) {
      if (_slidr) _add('horizontal', slides, opt_transition, opt_overwrite);
    };

    /**
     * Adds a set of vertical slides.
     * @param {Array} slides A list of data-slidr id's to add to Slidr. Slides must be children elements of the Slidr.
     * @param {String?} opt_transition The transition to apply between the slides, defaults to none.
     * @param {Boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
     */
    self.vertical = function(slides, opt_transition, opt_overwrite) {
      if (_slidr) _add('vertical', slides, opt_transition, opt_overwrite);
    };

    /**
     * A {mapping} of slides to their neighbors.
     */
    var _slides = {};

    /**
     * A {mapping} of slides and their transition effects.
     */
    var _trans = {};

    /**
     * Valid slides contained in the DOM within our Slidr element.
     */
    var _validSlides = {};

    /**
     * Whether we've successfully called start().
     */
    var _started = false;

    /**
     * Whether we've successfully displayed the start slide.
     */
    var _displayed = false;

    /**
     * The slide to start at.
     */
    var _start = null;

    /**
     * The current slide.
     */
    var _current = null;

    /**
     * Find all direct children of our Slidr with an id attribute.
     */
    function _findValidSlides() {
      _validSlides = {};
      if (_slidr) {
        var slide;
        for (var i = 0; slide = _slidr.childNodes[i]; i++) {
          if (slide.getAttribute) {
            var name = slide.getAttribute('data-slidr');
            if (name && !(name in _validSlides)) _validSlides[name] = slide;
          }
        }
      }
      return _validSlides;
    }

    /**
     * Helper functions for generating css keyframes.
     */
    var _cssHelper = {
      'cube': function(animation, rotateStart, rotateEnd, translateZ, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'rotate' + rotateStart + ' translateZ(' + translateZ + 'px)', 'opacity': opacityStart },
          '100': { 'transform': 'rotate' + rotateEnd + ' translateZ(' + translateZ + 'px)', 'opacity': opacityEnd }
        });
      },
      'fade': function(animation, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, { '0': { 'opacity': opacityStart }, '100': { 'opacity': opacityEnd } });
      },
      'linear': function(animation, translateStart, translateEnd, opacityStart, opacityEnd) {
        _slidrCSS.createKeyframe(animation, {
          '0': { 'transform': 'translate' + translateStart, 'opacity': opacityStart },
          '100': { 'transform': 'translate' + translateEnd, 'opacity': opacityEnd }
        });
      },
    };

    /**
     * Defines our available transitions.
     */
    var _css = {
      'cube': {
        'supported': _slidrCSS.supports('animation', 'backface-visibility', 'transform-style', 'transform', 'opacity'),
        'init': function() { 
          return _slidrCSS.fixup({
            'backface-visibility': 'hidden',
            'transform-style': 'preserve-3d'
          });
        },
        'timing': function(animation) { return animation + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
        'in': {
          'left': function(w) { _cssHelper['cube']('slidr-cube-in-left',
            'Y(90deg)', 'Y(0deg)', w/2, _settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['cube']('slidr-cube-in-right',
            'Y(-90deg)', 'Y(0deg)', w/2, _settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['cube']('slidr-cube-in-up',
            'X(-90deg)', 'X(0deg)', h/2, _settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['cube']('slidr-cube-in-down',
            'X(90deg)', 'X(0deg)', h/2, _settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['cube']('slidr-cube-out-left',
            'Y(0deg)', 'Y(90deg)', w/2, '1', _settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['cube']('slidr-cube-out-right',
            'Y(0deg)', 'Y(-90deg)', w/2, '1', _settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['cube']('slidr-cube-out-up',
            'X(0deg)', 'X(-90deg)', h/2, '1', _settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['cube']('slidr-cube-out-down',
            'X(0deg)', 'X(90deg)', h/2, '1', _settings['fading'] ? '0' : '1'); },
        }
      },
      'fade': {
        'supported': _slidrCSS.supports('animation', 'opacity'),
        'init': function() {
          _cssHelper['fade']('slidr-fade-in', '0', '1');
          _cssHelper['fade']('slidr-fade-out', '1', '0');
          return null; 
        },
        'timing': function(animation) { return animation + ' 0.4s ease-out 0s'; },
      },
      'linear': {
        'supported': _slidrCSS.supports('transform', 'opacity'),
        'init': function() { return null; },
        'timing': function(animation) { return animation + ' 0.6s ease-out 0s'; },
        'in': {
          'left': function(w) { _cssHelper['linear']('slidr-linear-in-left',
            'X(' + w + 'px)', 'X(0px)', _settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['linear']('slidr-linear-in-right',
            'X(-' + w + 'px)', 'X(0px)', _settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['linear']('slidr-linear-in-up',
            'Y(' + h + 'px)', 'Y(0px)', _settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['linear']('slidr-linear-in-down',
            'Y(-' + h + 'px)', 'Y(0px)', _settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['linear']('slidr-linear-out-left',
            'X(0px)', 'X(' + w + 'px)', '1', _settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['linear']('slidr-linear-out-right',
            'X(0px)', 'X(-' + w + 'px)', '1', _settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['linear']('slidr-linear-out-up',
            'Y(0px)', 'Y(' + h + 'px)', '1', _settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['linear']('slidr-linear-out-down',
            'Y(0px)', 'Y(-' + h + 'px)', '1', _settings['fading'] ? '0' : '1'); },
        }
      },
      'none': {
        'supported': true,
        'init': function() { return null; },
        'timing': null,
      }
    };

    /**
     * CSS rules to apply to a slide on initialize.
     */
    function _cssInit(el, trans) {
      var init = lookup(_css, [trans, 'init'])() || {};
      var slide = _slides[el];
      if (!slide.initialized) {
        var display = css(slide.target, 'display');
        extend(init, {
          'display': (display === 'none') ? 'block' : display,
          'visibility': 'visible',
          'position': 'absolute',
          'left': '50%',
          'margin-left': '-' + css(slide.target, 'width')/2 + 'px',
          'opacity': '0',
          'z-index': '0',
          'pointer-events': 'none'
        });
        slide.initialized = true;
      }
      css(slide.target, init);
    }

    /**
     * Resolve keyframe animation name.
     */
    function _cssAnimationName(trans, type, dir) {
      var parts = ['slidr', trans, type];
      if (trans !== 'fade' && dir) {
        parts.push(dir);
      }
      return parts.join('-');
    }

    /**
     * Animate an `el` with `trans` effects coming [in|out] as `type` from direction `dir`.
     */
    function _cssAnimate(el, trans, type, opt_dir) {
      var anim = {
        'opacity': (type === 'in') ? '1': '0',
        'z-index': (type === 'in') ? '1': '0',
        'pointer-events': (type === 'in') ? 'auto': 'none'
      };
      var target = _slides[el].target;
      if (lookup(_css, [trans, 'supported'])) {
        var timing = lookup(_css, [trans, 'timing']);
        if (timing) {
          anim['animation'] = timing(_cssAnimationName(trans, type, opt_dir));
          var keyframe = lookup(_css, [trans, type, opt_dir]);
          if (keyframe) keyframe(css(target, (opt_dir === 'up' || opt_dir === 'down') ? 'height' : 'width'));
        }
      }
      css(target, anim);
    }

    /**
     * Get the next transition for `el` entering/leaving the viewport from direction `dir`.
     */
    function _getTransition(el, dir) {
      return lookup(_trans, [el, dir]);
    }

    /**
     * Validate a transition.
     */
    function _validateTransition(trans) {
      return (self.transitions.indexOf(trans) < 0
        || !lookup(_css, [trans, 'supported'])) ? _settings['transition'] : trans;
    }

    /**
     * Set `trans` for an `el` going in direciton `dir`.
     */
    function _setTransition(el, dir, trans) {
      trans = _validateTransition(trans);
      if (!_trans[el]) {
        _trans[el] = {};
      }
      _trans[el][dir] = trans;
      return trans;
    }

    /**
     * Apply a transition to an `el`, coming [in|out] of the Slidr as `type`, in direction `dir`.
     */
    function _applyTransition(el, type, dir) {
      if (el && type && dir) {
        var trans = _getTransition(el, dir);
        if (trans) {
          _cssAnimate(el, trans, type, dir);
        }
      }
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
      var overFlow = { 'linear': true };
      current = _getTransition(current, dir);
      next = _getTransition(next, _opposite(dir));
      return ((dir === 'left' || dir === 'right') && (overFlow[current] || overFlow[next]));
    }

    /**
     * Transition to the next slide in the `dir` direction.
     */
    function _slide(dir) {
      var next = lookup(_slides, [_current, dir]);
      if (!!_current && !!next) {
        css(_slidr, { overflow: _hasOverflow(_current, next, dir) ? 'hidden' : 'auto' });
        _applyTransition(_current, 'out', dir);
        _current = next;
        _applyTransition(next, 'in', _opposite(dir));
        return true;
      }
      return false;
    }

    /**
     * Display our starting slide.
     */
    function _display() {
      if (!_displayed && _slides[_start]) {
        _current = _start;
        _cssInit(_current, 'fade');
        _cssAnimate(_current, 'fade', 'in');
        _displayed = true;
        return true;
      }
      return false;
    }

    /**
     * Check whether Slidr height or width should be dynamically set.
     */
    function isDynamic() {
      var clone = _slidr.cloneNode(false);
      var dummy = document.createElement('div');
      dummy.setAttribute('style', 'width: 42px; height: 42px;');
      clone.setAttribute('style', 'position: absolute; opacity: 0');
      clone.appendChild(dummy);
      _slidr.parentNode.insertBefore(clone, _slidr);
      var dynamic = {
        height: css(clone, 'height') === (42 + dynamicHeight()),
        width: css(clone, 'width') === (42 + dynamicWidth())
      }
      _slidr.parentNode.removeChild(clone);
      return dynamic;
    }

    function dynamicHeight() {
     return css(_slidr, 'padding-top') + css(_slidr, 'padding-bottom');
    }

    function dynamicWidth() {
      return css(_slidr, 'padding-left') + css(_slidr, 'padding-right');
    }

    /**
     * Watch for height and width changes in the slides, propagate the change to the slidr container.
     */
    function _autoResize() {
      var height = 0;
      var width = 0;
      var dynamic = isDynamic();
      var timerId = setInterval((function watchDimensions() {
        if (!contains(document, _slidr)) {
          clearInterval(timerId);
        } else if (css(_slidr, 'visibility') === 'hidden') {
          height = _setHeight(0);
          width = _setWidth(0);
        } else if (_slides[_current]) {
          var target = _slides[_current].target;
          var newHeight = css(target, 'height');
          if (dynamic.height && height != newHeight) {
            height = _setHeight(newHeight);
          }
          var parentWidth = css(_slidr.parentNode, 'width');
          var newWidth = css(target, 'width');
          var ignorePadding = false;
          if (parentWidth > newWidth) {
            newWidth = parentWidth;
            ignorePadding = true;
          }
          if (dynamic.width && width != newWidth) {
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
      css(_slidr, { height: height + dynamicHeight() + 'px' });
      return height;
    }

    /**
     * Sets the width of our Slidr container.
     */
    function _setWidth(width, ignorePadding) {
      var padding = (!!ignorePadding) ? 0 : css(_slidr, 'padding-left') + css(_slidr, 'padding-right');
      var margin = css(_slidr, 'margin-left') + css(_slidr, 'margin-right');
      css(_slidr, { width: width + padding - margin + 'px' });
      return width;
    }

    /**
     * Validate the slides we're trying to add isn't going to conflict with existing mapping.
     */
    function _validateAdd(dir, slides, trans) {
      if (!dir || !slides || slides.constructor !== Array) return false;
      var prev = (dir === 'horizontal') ? 'left' : 'up';
      var next = (dir === 'horizontal') ? 'right' : 'down';
      var current;
      _findValidSlides();
      // For each slide we're trying to add, check it against our known mapping.
      for (var i = 0; current = slides[i]; i++) {
        if (!(current in _validSlides)) return false;
        if (_slides[current]) {
          var newPrev = slides[i-1] || null;
          var newNext = slides[i+1] || null;
          var existingPrev = _slides[current][prev] || null;
          var existingNext = _slides[current][next] || null;
          var existingPrevTransition = lookup(_trans, [current, prev]);
          var existingNextTransition = lookup(_trans, [current, next]);
          var previousPrev = lookup(_slides, [newNext, prev]);
          // Are we about to override an existing mapping?
          if ((existingNext && newNext && existingNext != newNext)
            || (existingPrev && newPrev && existingPrev != newPrev)
            || (previousPrev && previousPrev != current)
            || (newPrev && existingPrevTransition && existingPrevTransition != trans)
            || (newNext && existingNextTransition && existingNextTransition != trans)
          ) {
            return false;
          }
        }
      }
      return true;
    }

    /**
     * Adds a [list] of slides we want to navigate in the horizontal/vertical direction.
     */
    function _add(dir, slides, opt_transition, opt_overwrite) {
      var trans = _validateTransition(opt_transition);
      if (!_validateAdd(dir, slides, trans) && !opt_overwrite) {
        if (!!console && !!console.log) {
          console.log('[Slidr] ' + dir + ' add error, conflicts with existing mapping.');
        }
        return false;
      }
      var prev = (dir === 'horizontal') ? 'left' : 'up';
      var next = (dir === 'horizontal') ? 'right' : 'down';
      var current;
      // For each slide, add it to our mapping.
      for (var i = 0; current = slides[i]; i++) {
        if (!_slides[current]) {
          _slides[current] = {};
          _slides[current].target = _validSlides[current];
        }
        if (!!slides[i-1]) {
          _slides[current][prev] = slides[i-1];
          _setTransition(current, prev, trans);
        }
        if (!!slides[i+1]) {
          _slides[current][next] = slides[i+1];
          _setTransition(current, next, trans);
        }
        _cssInit(current, trans);
        _start = (!_start) ? current : _start;
      }
      if (_started && !_displayed) _display();
      return true;
    }

  };

  /**
   * Helper for creating Slidr CSS.
   */
  function SlidrCSS() {

    var self = this;

    /**
     * Resolves a css property name to the browser supported name, or null if not supported.
     */
    self.resolve = function(cssProperty, forCSS) {
      if (_propertyCache[cssProperty]) {
        return (forCSS) ? _propertyCache[cssProperty].css : _propertyCache[cssProperty].dom;
      }
      var result = _normalize(cssProperty);
      if (_style[result] !== undefined) {
        _propertyCache[cssProperty] = {
          css: cssProperty,
          dom: result
        };
        return (forCSS) ? cssProperty : result;
      }
      var prefix = _getDOMPrefix(cssProperty);
      if (!!prefix) {
        result = _normalize(cssProperty, prefix);
        if (_style[result] !== undefined) {
          _propertyCache[cssProperty] = {
            css: _cssPrefix + cssProperty,
            dom: result
          };
          return (forCSS) ?  _propertyCache[cssProperty].css : result;
        }
      }
      // Browser does not support this property.
      _propertyCache[cssProperty] = null;
      return null;
    };

    /**
     * Check whether all given css properties are supported in the browser.
     */
    self.supports = function(/* prop1, prop2... */) {
      var prop;
      for (var i = 0; prop = arguments[i]; i++) {
        if (!self.resolve(prop)) return false;
      }
      return true;
    };

    /**
     * Applies necessary CSS browser prefixes for a set of properties.
     */
    self.fixup = function(properties) {
      var result = {};
      for (var p in properties) {
        if (self.resolve(p)) {
          result[self.resolve(p)] = properties[p];
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
          rule.push(self.resolve(p, true) + ': ' + properties[p] + ';');
        }
        rule.push('}');
      }
      rule.push('}');
      rule = rule.join(' ');
      _addCSSRule(name, rule);
    };

    /**
     * Pointer to the document style sheets.
     */
    var _style = document.getElementsByTagName('html')[0]['style'];

    /**
     * Pointer to our Slidr CSS style sheet.
     */
    var _styleSheet = (function() {
      var style = document.createElement('style');
      style.type = 'text/css';
      document.head.appendChild(style);
      return style.sheet || style.styleSheet;
    }());

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
     * Adds a CSS rule to our Slidr stylesheet.
     */
    function _addCSSRule(name, rule) {
      var cssRule;
      for (var r = 0; cssRule = _styleSheet.cssRules[r]; r++) {
        if (cssRule.name == name) {
          _styleSheet.deleteRule(r);
          break;
        }
      }
      _styleSheet.insertRule(rule, _styleSheet.cssRules.length);
    }

    /**
     * Given a css property and a optional dom prefix, tranlate it into a DOM document representation.
     */
    function _normalize(prop, opt_domPrefix) {
      prop = prop.split('-');
      var p;
      for (var i = 0; p = prop[i]; i++) prop[i] = p[0].toUpperCase() + p.toLowerCase().slice(1);
      (!!opt_domPrefix) ? prop.unshift(opt_domPrefix) : prop[0] = prop[0].toLowerCase();
      return prop.join('');
    }

    /**
     * Given a css property, retrieves the DOM prefix if applicable.
     */
    function _getDOMPrefix(cssProperty) {
      if (_domPrefix === null && isString(cssProperty)) {
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
  };

}(window, document));

