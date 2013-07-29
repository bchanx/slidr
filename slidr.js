//
// Copyright 2013. All Rights Reserved.
// Author: Brian Chan
// Contact: bchanx@gmail.com
//

/**
 * slidr - A simple Javascript library for adding slide effects. Currently under development.
 */
(function(root, factory) {
  // CommonJS
  if (typeof exports === 'object') module.exports = factory();
  // AMD module
  else if (typeof define === 'function' && define.amd) define(factory);
  // Browser globals
  else root.slidr = factory();
} (this, function() {
  'use strict';

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
   * If `props` is a string, do a css lookup. Otherwise, add css styles to `el`.
   */
  function css(el, props) {
    if (isString(props)) {
      var style = window.getComputedStyle(el)[_slidrCSS.resolve(props)];
      return (style) ? (style.slice(-2) === 'px' && style.indexOf('px') == style.length - 2) ? 
        parseInt(style.slice(0, -2)) : style : 'none';
    }
    for (var p in props) if (_slidrCSS.resolve(p)) el.style[_slidrCSS.resolve(p)] = props[p];
    return el;
  }

  /**
   * The Slidr constructor.
   */
  var Slidr = function(target, opt_settings) {
    // Reference to the Slidr element.
    var slidr = target;

    // Settings for this Slidr.
    var settings = extend({
      'transition': 'none',
      'direction': 'horizontal',
      'fading': true
    }, opt_settings);

    // A {mapping} of slides to their neighbors.
    var _slides = {};

    // A {mapping} of slides and their transition effects.
    var _trans = {};

    // Whether we've successfully called start().
    var _started = false;

    // Whether we've successfully started to display.
    var _displayed = false;

    // The slide to start at.
    var _start = null;

    // The current slide.
    var _current = null;

    var transition = {
      // Available transitions.
      available: ['cube', 'fade', 'linear', 'none'],
      // Validates a given transition.
      validate: function(trans) {
        return (this.available.indexOf(trans) < 0
          || !lookup(_css, [trans, 'supported'])) ? settings['transition'] : trans;
      },
      // Get the direction transition for an element.
      get: function(el, dir) {
        return lookup(_trans, [el, dir]);
      },
      // Sets the direction transition for an element.
      set: function(el, dir, trans) {
        trans = this.validate(trans);
        if (!_trans[el]) _trans[el] = {};
        _trans[el][dir] = trans;
        return trans;
      },
      // Applies a directional transition to an element entering/leaving the Slidr.
      apply: function(el, type, dir) {
        var trans = this.get(el, dir);
        if (trans) _cssAnimate(el, trans, type, dir);
      }
    };

    var slides = {
      // Get the data-slidr id.
      get: function(el, dir) {
        return lookup(_slides, [el, dir]);
      },
      // Finds all valid slides (direct children with 'data-slidr' attributes).
      find: function(opt_asList) {
        var valid = (opt_asList) ? [] : {};
        var slide, name;
        for (var i = 0; slide = slidr.childNodes[i]; i++) {
          if (slide.getAttribute) {
            name = slide.getAttribute('data-slidr');
            if (name) {
              if (opt_asList && valid.indexOf(name) < 0) valid.push(name);
              else if (!(name in valid)) valid[name] = slide;
            }
          }
        }
        return valid;
      },
      // Validate the [ids] we're trying to add doesn't conflict with existing slide assignments.
      validate: function(ids, trans, valid, prev, next) {
        if (!ids || ids.constructor !== Array) return false;
        var current;
        // For each slide we're trying to add, check it against our known mapping.
        for (var i = 0; current = ids[i]; i++) {
          if (!(current in valid)) return false;
          if (_slides[current]) {
            var newPrev = ids[i-1] || null;
            var newNext = ids[i+1] || null;
            var oldPrev = this.get(current, prev);
            var oldNext = this.get(current, next);
            var previousPrev = this.get(newNext, prev);
            var oldPrevTrans = transition.get(current, prev);
            var oldNextTrans = transition.get(current, next);
            // Are we about to override an existing mapping?
            if ((oldNext && newNext && oldNext != newNext)
              || (oldPrev && newPrev && oldPrev != newPrev)
              || (previousPrev && previousPrev != current)
              || (newPrev && oldPrevTrans && oldPrevTrans != trans)
              || (newNext && oldNextTrans && oldNextTrans != trans)
            ) {
              return false;
            }
          }
        }
        return true;
      },
      // Adds a [list] of ids to our Slidr.
      add: function(ids, trans, valid, prev, next) {
        var current;
        for (var i = 0; current = ids[i]; i++) {
          if (!_slides[current]) {
            _slides[current] = {};
            _slides[current].target = valid[current];
          }
          if (ids[i-1]) {
            _slides[current][prev] = ids[i-1];
            transition.set(current, prev, trans);
          }
          if (ids[i+1]) {
            _slides[current][next] = ids[i+1];
            transition.set(current, next, trans);
          }
          _cssInit(current, trans);
          _start = (!_start) ? current : _start;
        }
        if (_started && !_displayed) _display();
        return true;
      }
    };

    var self = this;

    /**
     * Start the Slidr!
     * @param {string} opt_start slide to start on.
     */
    self.start = function(opt_start) {
      if (!_started && slidr) {
        var display = css(slidr, 'display');
        var position = css(slidr, 'position');
        css(slidr, {
          'visibility': 'visible',
          'opacity': '1',
          'display': (display !== 'inline-block') ? 'table' : display,
          'position': (position === 'static') ? 'relative' : position
        });
        if (!_start) _add(settings['direction'], slides.find(true), settings['transition']);
        if (_slides[opt_start]) _start = opt_start;
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
      return _started && !!slides.get(_current, dir);
    };

    /**
     * Slide.
     * @param {string} dir slide 'up', 'down', 'left', or 'right'.
     */
    self.slide = function(dir) {
      return _started && _slide(dir);
    };

    /**
     * Adds a set of slides.
     * @param {string} direction `horizontal` or `vertical`.
     * @param {Array} ids A list of `data-slidr` id's to add to Slidr. Slides must be children elements of the Slidr.
     * @param {string?} opt_transition The transition to apply between the slides. Defaults to settings.
     * @param {boolean?} opt_overwrite Whether to overwrite existing slide mappings/transitions if conflicts occur.
     */
    self.add = function(direction, ids, opt_transition, opt_overwrite) {
      if (slidr) {
        var trans = transition.validate(opt_transition);
        var valid = slides.find();
        var prev = (direction === 'horizontal' || direction === 'h') ? 'left' : 'up';
        var next = (direction === 'horizontal' || direction === 'h') ? 'right' : 'down';
        if (!slides.validate(ids, trans, valid, prev, next) && !opt_overwrite) {
          console.warn('[Slidr] Error adding [' + direction + '] slides.');
          return false;
        }
        return slides.add(ids, trans, valid, prev, next);
      }
    };

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
          return {
            'backface-visibility': 'hidden',
            'transform-style': 'preserve-3d'
          };
        },
        'timing': function(animation) { return animation + ' 1s cubic-bezier(0.15, 0.9, 0.25, 1) 0s'; },
        'in': {
          'left': function(w) { _cssHelper['cube']('slidr-cube-in-left',
            'Y(90deg)', 'Y(0deg)', w/2, settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['cube']('slidr-cube-in-right',
            'Y(-90deg)', 'Y(0deg)', w/2, settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['cube']('slidr-cube-in-up',
            'X(-90deg)', 'X(0deg)', h/2, settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['cube']('slidr-cube-in-down',
            'X(90deg)', 'X(0deg)', h/2, settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['cube']('slidr-cube-out-left',
            'Y(0deg)', 'Y(90deg)', w/2, '1', settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['cube']('slidr-cube-out-right',
            'Y(0deg)', 'Y(-90deg)', w/2, '1', settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['cube']('slidr-cube-out-up',
            'X(0deg)', 'X(-90deg)', h/2, '1', settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['cube']('slidr-cube-out-down',
            'X(0deg)', 'X(90deg)', h/2, '1', settings['fading'] ? '0' : '1'); },
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
            'X(' + w + 'px)', 'X(0px)', settings['fading'] ? '0' : '1', '1'); },
          'right': function(w) { _cssHelper['linear']('slidr-linear-in-right',
            'X(-' + w + 'px)', 'X(0px)', settings['fading'] ? '0' : '1', '1'); },
          'up': function(h) { _cssHelper['linear']('slidr-linear-in-up',
            'Y(' + h + 'px)', 'Y(0px)', settings['fading'] ? '0' : '1', '1'); },
          'down': function(h) { _cssHelper['linear']('slidr-linear-in-down',
            'Y(-' + h + 'px)', 'Y(0px)', settings['fading'] ? '0' : '1', '1'); },
        },
        'out': {
          'left': function(w) { _cssHelper['linear']('slidr-linear-out-left',
            'X(0px)', 'X(' + w + 'px)', '1', settings['fading'] ? '0' : '1'); },
          'right': function(w) { _cssHelper['linear']('slidr-linear-out-right',
            'X(0px)', 'X(-' + w + 'px)', '1', settings['fading'] ? '0' : '1'); },
          'up': function(h) { _cssHelper['linear']('slidr-linear-out-up',
            'Y(0px)', 'Y(' + h + 'px)', '1', settings['fading'] ? '0' : '1'); },
          'down': function(h) { _cssHelper['linear']('slidr-linear-out-down',
            'Y(0px)', 'Y(-' + h + 'px)', '1', settings['fading'] ? '0' : '1'); },
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
     * Returns the opposite direction.
     */
    function _opposite(dir) {
      return (dir === 'up') ? 'down' : (dir === 'down') ? 'up' : (dir === 'left') ? 'right' : 'left';
    }

    /**
     * Check if a Slidr transition will have overflow issues.
     */
    function _hasOverflow(current, next, dir) {
      current = transition.get(current, dir);
      next = transition.get(next, _opposite(dir));
      return ((dir === 'left' || dir === 'right') && (current === 'linear' || next === 'linear'));
    }

    /**
     * Transition to the next slide in direction `dir`.
     */
    function _slide(dir) {
      var next = slides.get(_current, dir);
      if (_current && next) {
        css(slidr, { overflow: _hasOverflow(_current, next, dir) ? 'hidden' : 'auto' });
        transition.apply(_current, 'out', dir);
        _current = next;
        transition.apply(next, 'in', _opposite(dir));
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
      }
    }

    /**
     * Check whether Slidr height or width should be dynamically set.
     */
    function isDynamic() {
      var clone = slidr.cloneNode(false);
      var dummy = document.createElement('div');
      dummy.setAttribute('style', 'width: 42px; height: 42px;');
      clone.setAttribute('style', 'position: absolute; opacity: 0');
      clone.appendChild(dummy);
      slidr.parentNode.insertBefore(clone, slidr);
      var dynamic = {
        height: css(clone, 'height') === (42 + dynamicHeight()),
        width: css(clone, 'width') === (42 + dynamicWidth())
      };
      slidr.parentNode.removeChild(clone);
      return dynamic;
    }

    /**
     * Grabs slidr height padding.
     */
    function dynamicHeight() {
      return css(slidr, 'padding-top') + css(slidr, 'padding-bottom');
    }

    /**
     * Grabs slidr width padding.
     */
    function dynamicWidth() {
      return css(slidr, 'padding-left') + css(slidr, 'padding-right');
    }

    /**
     * Watch for height and width changes in the slides, propagate the change to the slidr container.
     */
    function _autoResize() {
      var height = 0;
      var width = 0;
      var dynamic = isDynamic();
      var timerId = setInterval((function watchDimensions() {
        if (!contains(document, slidr)) {
          clearInterval(timerId);
        } else if (css(slidr, 'visibility') === 'hidden') {
          height = _setHeight(0);
          width = _setWidth(0);
        } else if (_slides[_current]) {
          var target = _slides[_current].target;
          var newHeight = css(target, 'height');
          var parentWidth = css(slidr.parentNode, 'width');
          var newWidth = css(target, 'width');
          var ignorePadding = false;
          if (parentWidth > newWidth) {
            newWidth = parentWidth;
            ignorePadding = true;
          }
          if (dynamic.height && height != newHeight) height = _setHeight(newHeight);
          if (dynamic.width && width != newWidth) width = _setWidth(newWidth, ignorePadding);
        }
        return watchDimensions;
      })(), 250);
    }

    /**
     * Sets the height of our Slidr container.
     */
    function _setHeight(height) {
      css(slidr, { height: height + dynamicHeight() + 'px' });
      return height;
    }

    /**
     * Sets the width of our Slidr container.
     */
    function _setWidth(width, ignorePadding) {
      var padding = (!!ignorePadding) ? 0 : css(slidr, 'padding-left') + css(slidr, 'padding-right');
      var margin = css(slidr, 'margin-left') + css(slidr, 'margin-right');
      css(slidr, { width: width + padding - margin + 'px' });
      return width;
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

  /**
   * Global API.
   */
  return {
    create: function(id, opt_settings) {
      var target = document.getElementById(id);
      if (!target) {
        console.warn('[Slidr] Could not find element with id: ' + id + '.');
        return;
      }
      return new Slidr(target, opt_settings);
    }
  };

}));

